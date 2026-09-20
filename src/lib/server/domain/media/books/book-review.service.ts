import {and, count, desc, eq, or, sql} from "drizzle-orm";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {bookEditions, books, booksAuthors, booksList, bookWorkCandidates, bookWorkExclusions} from "@/lib/server/database/schema";
import {BOOK_WORK_SELECTION_LIMIT} from "@/lib/schemas/book-editions.schema";
import {bookAuthorReviewKey, conflictingBookVariants, reviewBookMatch} from "./book-matching";

export const recordBookCandidate = (firstId: number, secondId: number, score: number, evidence: string[], source: "scan" | "reader" = "scan") => {
    if (firstId === secondId) return false;
    const [firstWorkId, secondWorkId] = [firstId, secondId].sort((a, b) => a - b);
    const tx = getDbClient();
    if (tx.select().from(bookWorkExclusions).where(and(eq(bookWorkExclusions.firstWorkId, firstWorkId), eq(bookWorkExclusions.secondWorkId, secondWorkId))).get()) return false;
    tx.insert(bookWorkCandidates).values({firstWorkId, secondWorkId, score, evidence, source}).onConflictDoUpdate({
        target: [bookWorkCandidates.firstWorkId, bookWorkCandidates.secondWorkId],
        set: {score: sql`max(${bookWorkCandidates.score}, excluded.score)`,
            evidence: sql`CASE WHEN excluded.score >= ${bookWorkCandidates.score} THEN excluded.evidence ELSE ${bookWorkCandidates.evidence} END`,
            source: sql`CASE WHEN ${bookWorkCandidates.source} = 'reader' THEN 'reader' ELSE excluded.source END`, updatedAt: sql`CURRENT_TIMESTAMP`},
    }).run();
    return true;
};

export const scanBookWorkCandidates = () => withTransaction(() => {
    const tx = getDbClient();
    const editions = tx.select().from(bookEditions).all();
    const works = new Map(tx.select({id: books.id, name: books.name}).from(books).all().map(row => [row.id, row]));
    const authors = tx.select().from(booksAuthors).all();
    const authorsByWork = new Map<number, string[]>();
    for (const author of authors) {const names = authorsByWork.get(author.mediaId) ?? []; names.push(author.name); authorsByWork.set(author.mediaId, names);}
    // Include curated work names and authors as well as provider edition names.
    const identities = editions.map(edition => ({...edition, aliases: [...new Set([edition.name, works.get(edition.mediaId)!.name])],
        authors: [...new Set([...edition.authors, ...(authorsByWork.get(edition.mediaId) ?? [])])]}));
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < identities.length; i++) {
        const edition = identities[i];
        const keys = [...edition.authors.map(author => `author:${bookAuthorReviewKey(author)}`), ...edition.isbns.map(isbn => `isbn:${isbn}`),
            ...(edition.openLibraryWorkId ? [`work:${edition.openLibraryWorkId}`] : [])];
        for (const key of new Set(keys)) {
            const bucket = buckets.get(key) ?? []; bucket.push(i); buckets.set(key, bucket);
        }
    }
    const checked = new Set<string>();
    const matches = new Map<string, {firstId: number; secondId: number; score: number; evidence: string[]}>();
    for (const indexes of buckets.values()) for (let i = 0; i < indexes.length; i++) for (let j = i + 1; j < indexes.length; j++) {
        const a = identities[indexes[i]], b = identities[indexes[j]];
        if (a.mediaId === b.mediaId) continue;
        const pairKey = [a.id, b.id].sort((x, y) => x - y).join(":");
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);
        if (conflictingBookVariants(a.name, b.name) || conflictingBookVariants(works.get(a.mediaId)!.name, works.get(b.mediaId)!.name)) continue;
        const workKey = [a.mediaId, b.mediaId].sort((x, y) => x - y).join(":");
        for (const aName of a.aliases) for (const bName of b.aliases) {
            const match = reviewBookMatch({...a, name: aName}, {...b, name: bName});
            if (match && match.score > (matches.get(workKey)?.score ?? 0)) matches.set(workKey, {...match, firstId: a.mediaId, secondId: b.mediaId});
        }
    }
    tx.delete(bookWorkCandidates).where(eq(bookWorkCandidates.source, "scan")).run();
    let candidates = 0;
    for (const match of matches.values()) if (recordBookCandidate(match.firstId, match.secondId, match.score, match.evidence)) candidates++;
    return {works: works.size, editions: editions.length, comparisons: checked.size, candidates};
});

export const getBookReviewQueue = (page = 1, confidence: "all" | "high" | "possible" = "all") => {
    const tx = getDbClient();
    const pairs = tx.select().from(bookWorkCandidates).orderBy(desc(bookWorkCandidates.score)).all();
    const rows = tx.selectDistinct({id: books.id, name: books.name, imageCover: books.imageCover}).from(books)
        .innerJoin(bookWorkCandidates, or(eq(books.id, bookWorkCandidates.firstWorkId), eq(books.id, bookWorkCandidates.secondWorkId))).all();
    const readers = new Map(tx.select({id: booksList.mediaId, count: count()}).from(booksList).groupBy(booksList.mediaId).all().map(row => [row.id, row.count]));
    const works = new Map(rows.map(row => [row.id, {...row, readers: readers.get(row.id) ?? 0}]));
    const edges = new Map(pairs.map(pair => [`${pair.firstWorkId}:${pair.secondWorkId}`, pair]));
    const neighbors = new Map<number, Set<number>>();
    for (const pair of pairs) {
        for (const [id, other] of [[pair.firstWorkId, pair.secondWorkId], [pair.secondWorkId, pair.firstWorkId]]) {
            const adjacent = neighbors.get(id) ?? new Set<number>(); adjacent.add(other); neighbors.set(id, adjacent);
        }
    }
    const edge = (a: number, b: number) => edges.get([a, b].sort((x, y) => x - y).join(":"));
    const used = new Set<number>();
    const groups = [];
    pairs.sort((a, b) => b.score - a.score || (readers.get(b.firstWorkId) ?? 0) + (readers.get(b.secondWorkId) ?? 0) - (readers.get(a.firstWorkId) ?? 0) - (readers.get(a.secondWorkId) ?? 0) || a.firstWorkId - b.firstWorkId || a.secondWorkId - b.secondWorkId);
    for (const pair of pairs) {
        if (used.has(pair.firstWorkId) || used.has(pair.secondWorkId)) continue;
        const ids = [pair.firstWorkId, pair.secondWorkId];
        // Every member must have evidence against every other member; similarity is not transitive.
        for (const id of neighbors.get(pair.firstWorkId)!) if (ids.length < BOOK_WORK_SELECTION_LIMIT && !used.has(id) && !ids.includes(id)
            && ids.every(other => {const match = edge(id, other); return match && (pair.score < 90 || match.score >= 90);})) ids.push(id);
        const evidence = new Set<string>();
        let score = 100;
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
            const match = edge(ids[i], ids[j])!; score = Math.min(score, match.score); match.evidence.forEach(reason => evidence.add(reason));
        }
        ids.forEach(id => used.add(id));
        const groupWorks = ids.map(id => works.get(id)!).sort((a, b) => b.readers - a.readers || a.id - b.id);
        groups.push({key: [...ids].sort((a, b) => a - b).join(":"), workIds: ids, works: groupWorks, score,
            confidence: score >= 90 ? "high" as const : "possible" as const, evidence: [...evidence], readers: groupWorks.reduce((total, work) => total + work.readers, 0)});
    }
    groups.sort((a, b) => b.score - a.score || b.readers - a.readers || a.works[0].id - b.works[0].id);
    const filtered = groups.filter(group => confidence === "all" || group.confidence === confidence);
    return {groups: filtered.slice((page - 1) * 20, page * 20), total: filtered.length, highConfidence: groups.filter(group => group.confidence === "high").length,
        possible: groups.filter(group => group.confidence === "possible").length, hasNextPage: page * 20 < filtered.length};
};

// Author review is a live catalogue grouping, not a quadratic table of speculative work matches.
export const getBookAuthorReviewQueue = (page = 1) => {
    const tx = getDbClient();
    const readers = new Map(tx.select({id: booksList.mediaId, readers: count()}).from(booksList).groupBy(booksList.mediaId).all().map(row => [row.id, row.readers]));
    const works = new Map(tx.select({id: books.id, name: books.name, imageCover: books.imageCover}).from(books).all()
        .map(work => [work.id, {...work, readers: readers.get(work.id) ?? 0}]));
    const authors = tx.select({mediaId: booksAuthors.mediaId, name: booksAuthors.name}).from(booksAuthors).all();
    const editions = tx.select({mediaId: bookEditions.mediaId, authors: bookEditions.authors}).from(bookEditions).all();
    for (const edition of editions) for (const name of edition.authors) authors.push({mediaId: edition.mediaId, name});
    const byAuthor = new Map<string, {name: string; workIds: Set<number>}>();
    for (const author of authors) {
        const key = bookAuthorReviewKey(author.name);
        if (!key) continue;
        const group = byAuthor.get(key) ?? {name: author.name, workIds: new Set<number>()};
        group.workIds.add(author.mediaId);
        byAuthor.set(key, group);
    }
    const exclusions = new Set(tx.select().from(bookWorkExclusions).all().map(pair => `${pair.firstWorkId}:${pair.secondWorkId}`));
    const groups = new Map<string, {key: string; workIds: number[]; works: NonNullable<ReturnType<typeof works.get>>[]; confidence: "author"; evidence: string[]; readers: number}>();
    for (const author of byAuthor.values()) {
        const pending = [...author.workIds].sort((a, b) => works.get(b)!.readers - works.get(a)!.readers || a - b);
        while (pending.length > 1) {
            const ids = [pending.shift()!];
            for (let i = 0; i < pending.length && ids.length < BOOK_WORK_SELECTION_LIMIT;) {
                const id = pending[i];
                if (ids.every(other => !exclusions.has([id, other].sort((a, b) => a - b).join(":")))) {
                    ids.push(id); pending.splice(i, 1);
                }
                else i++;
            }
            if (ids.length < 2) continue;
            const key = [...ids].sort((a, b) => a - b).join(":");
            const groupWorks = ids.map(id => works.get(id)!);
            const existing = groups.get(key);
            const evidence = `Shared author: ${author.name}`;
            if (existing) existing.evidence.push(evidence);
            else groups.set(key, {key, workIds: ids, works: groupWorks, confidence: "author", evidence: [evidence],
                readers: groupWorks.reduce((total, work) => total + work.readers, 0)});
        }
    }
    const sorted = [...groups.values()].sort((a, b) => b.readers - a.readers || a.key.localeCompare(b.key));
    return {groups: sorted.slice((page - 1) * 20, page * 20), total: sorted.length, hasNextPage: page * 20 < sorted.length};
};
