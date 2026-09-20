import type {AnySQLiteColumn} from "drizzle-orm/sqlite-core";
import {createHash} from "node:crypto";
import {and, asc, desc, eq, inArray, like, ne, or, sql} from "drizzle-orm";
import {MediaType, Status} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import type {BookMergeInput} from "@/lib/schemas/book-editions.schema";
import {bookMatchEvidence} from "@/lib/server/domain/media/books/book-matching";
import {createBooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {createBooksStatistics} from "@/lib/server/domain/media/books/books.statistics";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {
    bookEditions, books, booksAuthors, booksGenre, booksList, booksTags, bookWorkAudit, bookWorkExclusions,
    collectionItems, dailyMediadle, importItems, mediaNotifications, user, userMediaMonthlyActivity,
    userMediaStatsHistory, userMediaUpdate, whichCameFirstMedia, whichCameFirstRounds,
} from "@/lib/server/database/schema";


const repository = createBooksRepository();

export const searchBookWorks = (query: string, page = 1) => {
    const condition = or(like(books.name, `%${query}%`), sql`EXISTS (
        SELECT 1 FROM ${bookEditions} WHERE ${bookEditions.mediaId} = ${books.id}
        AND (${bookEditions.name} LIKE ${`%${query}%`} OR ${bookEditions.apiId} = ${query}
            OR EXISTS (SELECT 1 FROM json_each(${bookEditions.isbns}) WHERE value = ${query}))
    )`);
    const items = getDbClient().select({
        id: books.id, name: books.name, imageCover: books.imageCover, releaseDate: books.releaseDate,
        authors: sql<string>`COALESCE((SELECT group_concat(name, ', ') FROM books_authors WHERE media_id = books.id), '')`,
        editions: sql<number>`(SELECT count(*) FROM book_editions WHERE media_id = books.id)`,
        readers: sql<number>`(SELECT count(*) FROM books_list WHERE media_id = books.id)`,
    }).from(books).where(condition).orderBy(asc(books.name)).limit(31).offset((page - 1) * 30).all();
    return { items: items.slice(0, 30), hasNextPage: items.length > 30 };
};

export const getBookWork = (mediaId: number) => {
    const work = repository.findById(mediaId);
    if (!work) throw new FormattedError("Book work not found.");
    const editions = repository.getEditions(mediaId);
    const excluded = getDbClient().select().from(bookWorkExclusions)
        .where(or(eq(bookWorkExclusions.firstWorkId, mediaId), eq(bookWorkExclusions.secondWorkId, mediaId))).all();
    const excludedIds = new Set(excluded.flatMap(row => [row.firstWorkId, row.secondWorkId]));
    const candidates = editions.length ? getDbClient().select().from(bookEditions).where(and(ne(bookEditions.mediaId, mediaId), or(
        ...editions.map(edition => sql`lower(${bookEditions.name}) = ${edition.name.toLowerCase()}`),
        ...editions.filter(edition => edition.openLibraryWorkId).map(edition => eq(bookEditions.openLibraryWorkId, edition.openLibraryWorkId!)),
        ...editions.flatMap(edition => edition.isbns).map(isbn => sql`EXISTS (SELECT 1 FROM json_each(${bookEditions.isbns}) WHERE value = ${isbn})`),
    ))).all() : [];
    const suggestions = new Map<number, { mediaId: number; name: string; evidence: string }>();
    for (const candidate of candidates) {
        if (excludedIds.has(candidate.mediaId)) continue;
        for (const edition of editions) {
            const evidence = bookMatchEvidence(edition, candidate);
            if (evidence) suggestions.set(candidate.mediaId, { mediaId: candidate.mediaId, name: candidate.name, evidence });
        }
    }
    const history = getDbClient().select({ id: bookWorkAudit.id, action: bookWorkAudit.action, createdAt: bookWorkAudit.createdAt,
        sourceWorkId: bookWorkAudit.sourceWorkId, targetWorkId: bookWorkAudit.targetWorkId })
        .from(bookWorkAudit).where(or(eq(bookWorkAudit.sourceWorkId, mediaId), eq(bookWorkAudit.targetWorkId, mediaId)))
        .orderBy(desc(bookWorkAudit.id)).limit(20).all();
    return { work, editions, suggestions: [...suggestions.values()], history };
};

const readMergeState = (sourceId: number, targetId: number, editionId?: number) => {
    const source = repository.findById(sourceId);
    const target = repository.findById(targetId);
    if (!source || !target || sourceId === targetId) throw new FormattedError("Choose two existing, different works.");
    const sourceEditions = repository.getEditions(sourceId);
    const targetEditions = repository.getEditions(targetId);
    if (editionId !== undefined && !sourceEditions.some(edition => edition.id === editionId)) {
        throw new FormattedError("The edition has moved. Reload the comparison.");
    }
    const sourceLists = getDbClient().select().from(booksList).where(and(eq(booksList.mediaId, sourceId),
        editionId === undefined || sourceEditions.length === 1 ? undefined : eq(booksList.editionId, editionId))).orderBy(asc(booksList.id)).all();
    const targetLists = getDbClient().select().from(booksList).where(eq(booksList.mediaId, targetId)).orderBy(asc(booksList.id)).all();
    const authors = getDbClient().select().from(booksAuthors).where(inArray(booksAuthors.mediaId, [sourceId, targetId])).orderBy(asc(booksAuthors.id)).all();
    const state = { source, target, sourceEditions, targetEditions, sourceLists, targetLists, authors };
    return { ...state, version: createHash("sha256").update(JSON.stringify(state)).digest("hex") };
};

export const previewBookMerge = (sourceId: number, targetId: number, editionId?: number) => {
    const state = readMergeState(sourceId, targetId, editionId);
    const conflicts = state.sourceLists.flatMap(source => {
        const target = state.targetLists.find(row => row.userId === source.userId);
        if (!target) return [];
        const summarize = (row: typeof source) => ({ status: row.status, rating: row.rating, total: row.total,
            actualPage: row.actualPage, pages: row.pages, redo: row.redo, hasComment: !!row.comment, editionName: row.editionName });
        return [{ userId: source.userId, name: getDbClient().select({ name: user.name }).from(user).where(eq(user.id, source.userId)).get()!.name,
            source: summarize(source), target: summarize(target) }];
    });
    return { source: { ...state.source, authors: state.authors.filter(row => row.mediaId === sourceId).map(row => row.name) },
        target: { ...state.target, authors: state.authors.filter(row => row.mediaId === targetId).map(row => row.name) },
        sourceEditions: state.sourceEditions, targetEditions: state.targetEditions,
        affectedReaders: state.sourceLists.length, conflicts, version: state.version };
};

export const keepBookWorksSeparate = (actorId: number, sourceId: number, targetId: number) => withTransaction(() => {
    const state = readMergeState(sourceId, targetId);
    const [firstWorkId, secondWorkId] = [sourceId, targetId].sort((a, b) => a - b);
    getDbClient().insert(bookWorkExclusions).values({ firstWorkId, secondWorkId }).onConflictDoNothing().run();
    getDbClient().insert(bookWorkAudit).values({ actorId, sourceWorkId: sourceId, targetWorkId: targetId, action: "separate",
        snapshot: { source: state.source, target: state.target } }).run();
});

export const mergeBookWorks = (actorId: number, input: BookMergeInput) => withTransaction(() => {
    const { sourceId, targetId, editionId } = input;
    const state = readMergeState(sourceId, targetId, editionId);
    if (state.version !== input.version) throw new FormattedError("These books changed. Reload the comparison before applying it.");
    const targetByUser = new Map(state.targetLists.map(row => [row.userId, row]));
    const conflicts = state.sourceLists.filter(row => targetByUser.has(row.userId));
    if (input.resolutions.length !== conflicts.length || new Set(input.resolutions.map(row => row.userId)).size !== conflicts.length
        || conflicts.some(row => !input.resolutions.some(resolution => resolution.userId === row.userId))) {
        throw new FormattedError("Resolve every overlapping reader before merging.");
    }
    const tx = getDbClient();
    const movingAll = editionId === undefined || state.sourceEditions.length === 1;
    const affectedUsers = state.sourceLists.map(row => row.userId);
    const sourceScope = <T extends { mediaId: AnySQLiteColumn; mediaType: AnySQLiteColumn; userId: AnySQLiteColumn }>(table: T) =>
        and(eq(table.mediaId, sourceId), eq(table.mediaType, MediaType.BOOKS), movingAll ? undefined : inArray(table.userId, affectedUsers));

    // Keep the original user data and history before resolving collisions. The UI exposes only the audit summary.
    const snapshot = {
        ...state, resolutions: input.resolutions, editionId,
        updates: tx.select().from(userMediaUpdate).where(and(eq(userMediaUpdate.mediaType, MediaType.BOOKS), inArray(userMediaUpdate.mediaId, [sourceId, targetId]))).all(),
        months: tx.select().from(userMediaMonthlyActivity).where(and(eq(userMediaMonthlyActivity.mediaType, MediaType.BOOKS), inArray(userMediaMonthlyActivity.mediaId, [sourceId, targetId]))).all(),
        tags: tx.select().from(booksTags).where(inArray(booksTags.mediaId, [sourceId, targetId])).all(),
        collections: tx.select().from(collectionItems).where(and(eq(collectionItems.mediaType, MediaType.BOOKS), inArray(collectionItems.mediaId, [sourceId, targetId]))).all(),
        authors: tx.select().from(booksAuthors).where(inArray(booksAuthors.mediaId, [sourceId, targetId])).all(),
        genres: tx.select().from(booksGenre).where(inArray(booksGenre.mediaId, [sourceId, targetId])).all(),
    };
    tx.insert(bookWorkAudit).values({ actorId, sourceWorkId: sourceId, targetWorkId: targetId,
        action: editionId === undefined ? "merge" : "move", snapshot }).run();

    for (const source of state.sourceLists) {
        const target = targetByUser.get(source.userId);
        if (!target) {
            tx.update(booksList).set({ mediaId: targetId }).where(eq(booksList.id, source.id)).run();
            continue;
        }
        const resolution = input.resolutions.find(row => row.userId === source.userId)!;
        const kept = resolution.keep === "source" ? source : target;
        const other = resolution.keep === "source" ? target : source;
        const rereadPages = resolution.reading === "combine"
            ? [...kept.rereadPages, ...other.rereadPages, ...(other.status === Status.COMPLETED ? [other.actualPage ?? 0] : [])]
            : kept.rereadPages;
        if (resolution.reading === "duplicate") {
            tx.delete(userMediaMonthlyActivity).where(and(eq(userMediaMonthlyActivity.mediaId, other.mediaId), eq(userMediaMonthlyActivity.mediaType, MediaType.BOOKS), eq(userMediaMonthlyActivity.userId, other.userId))).run();
            tx.delete(userMediaUpdate).where(and(eq(userMediaUpdate.mediaId, other.mediaId), eq(userMediaUpdate.mediaType, MediaType.BOOKS), eq(userMediaUpdate.userId, other.userId))).run();
        }
        tx.delete(booksList).where(eq(booksList.id, source.id)).run();
        tx.update(booksList).set({ ...kept, id: target.id, mediaId: targetId,
            rereadPages, redo: rereadPages.length,
            total: resolution.reading === "combine" ? source.total + target.total : kept.total,
        }).where(eq(booksList.id, target.id)).run();
    }

    const months = tx.select().from(userMediaMonthlyActivity).where(sourceScope(userMediaMonthlyActivity)).all();
    for (const month of months) {
        const target = tx.select().from(userMediaMonthlyActivity).where(and(eq(userMediaMonthlyActivity.mediaId, targetId),
            eq(userMediaMonthlyActivity.mediaType, MediaType.BOOKS), eq(userMediaMonthlyActivity.userId, month.userId), eq(userMediaMonthlyActivity.monthBucket, month.monthBucket))).get();
        if (target) {
            tx.update(userMediaMonthlyActivity).set({ progressGained: target.progressGained + month.progressGained,
                redoGained: target.redoGained + month.redoGained, hadCompletion: target.hadCompletion || month.hadCompletion,
                hidden: target.hidden || month.hidden, lastActivityAt: [target.lastActivityAt, month.lastActivityAt].sort().at(-1)!,
            }).where(eq(userMediaMonthlyActivity.id, target.id)).run();
            tx.delete(userMediaMonthlyActivity).where(eq(userMediaMonthlyActivity.id, month.id)).run();
        }
        else tx.update(userMediaMonthlyActivity).set({ mediaId: targetId }).where(eq(userMediaMonthlyActivity.id, month.id)).run();
    }
    const targetName = input.metadata === "source" && movingAll ? state.source.name : state.target.name;
    tx.update(userMediaUpdate).set({ mediaId: targetId, mediaName: targetName }).where(sourceScope(userMediaUpdate)).run();
    tx.update(userMediaStatsHistory).set({ mediaId: targetId }).where(sourceScope(userMediaStatsHistory)).run();
    tx.update(mediaNotifications).set({ mediaId: targetId }).where(sourceScope(mediaNotifications)).run();

    const tags = tx.select().from(booksTags).where(and(eq(booksTags.mediaId, sourceId), movingAll ? undefined : inArray(booksTags.userId, affectedUsers))).all();
    if (tags.length) tx.insert(booksTags).values(tags.map(({ id: _id, ...row }) => ({ ...row, mediaId: targetId }))).onConflictDoNothing().run();
    tx.delete(booksTags).where(and(eq(booksTags.mediaId, sourceId), movingAll ? undefined : inArray(booksTags.userId, affectedUsers))).run();
    tx.update(bookEditions).set({ mediaId: targetId, matchLocked: true }).where(and(eq(bookEditions.mediaId, sourceId), editionId === undefined ? undefined : eq(bookEditions.id, editionId))).run();

    if (movingAll) {
        if (input.metadata === "source") {
            const { id: _id, apiId: _apiId, addedAt: _addedAt, ...metadata } = state.source;
            tx.update(books).set(metadata).where(eq(books.id, targetId)).run();
            tx.delete(booksAuthors).where(eq(booksAuthors.mediaId, targetId)).run();
            const authors = snapshot.authors.filter(row => row.mediaId === sourceId);
            if (authors.length) tx.insert(booksAuthors).values(authors.map(({ id: _id, ...row }) => ({ ...row, mediaId: targetId }))).onConflictDoNothing().run();
        }
        const genres = snapshot.genres.filter(row => row.mediaId === sourceId);
        if (genres.length) tx.insert(booksGenre).values(genres.map(({ id: _id, ...row }) => ({ ...row, mediaId: targetId }))).onConflictDoNothing().run();
        for (const item of snapshot.collections.filter(row => row.mediaId === sourceId)) {
            const existing = tx.select({ id: collectionItems.id }).from(collectionItems)
                .where(and(eq(collectionItems.collectionId, item.collectionId), eq(collectionItems.mediaId, targetId))).get();
            if (existing) tx.delete(collectionItems).where(eq(collectionItems.id, item.id)).run();
            else tx.update(collectionItems).set({ mediaId: targetId }).where(eq(collectionItems.id, item.id)).run();
        }
        tx.update(importItems).set({ matchedMediaId: targetId }).where(and(eq(importItems.mediaType, MediaType.BOOKS), eq(importItems.matchedMediaId, sourceId))).run();
        tx.update(dailyMediadle).set({ mediaId: targetId }).where(and(eq(dailyMediadle.mediaType, MediaType.BOOKS), eq(dailyMediadle.mediaId, sourceId))).run();
        tx.delete(whichCameFirstMedia).where(and(eq(whichCameFirstMedia.mediaType, MediaType.BOOKS), inArray(whichCameFirstMedia.mediaId, [sourceId, targetId]))).run();
        const releaseDate = input.metadata === "source" ? state.source.releaseDate : state.target.releaseDate;
        if (releaseDate) tx.insert(whichCameFirstMedia).values({ mediaType: MediaType.BOOKS, mediaId: targetId, releaseDate }).run();
        tx.update(whichCameFirstRounds).set({ leftMediaId: targetId }).where(and(eq(whichCameFirstRounds.leftMediaType, MediaType.BOOKS), eq(whichCameFirstRounds.leftMediaId, sourceId))).run();
        tx.update(whichCameFirstRounds).set({ rightMediaId: targetId }).where(and(eq(whichCameFirstRounds.rightMediaType, MediaType.BOOKS), eq(whichCameFirstRounds.rightMediaId, sourceId))).run();
        const exclusions = tx.select().from(bookWorkExclusions).where(or(eq(bookWorkExclusions.firstWorkId, sourceId), eq(bookWorkExclusions.secondWorkId, sourceId))).all();
        for (const row of exclusions) {
            const other = row.firstWorkId === sourceId ? row.secondWorkId : row.firstWorkId;
            if (other === targetId) continue;
            const [firstWorkId, secondWorkId] = [other, targetId].sort((a, b) => a - b);
            tx.insert(bookWorkExclusions).values({ firstWorkId, secondWorkId }).onConflictDoNothing().run();
        }
        tx.delete(booksAuthors).where(eq(booksAuthors.mediaId, sourceId)).run();
        tx.delete(booksGenre).where(eq(booksGenre.mediaId, sourceId)).run();
        tx.delete(books).where(eq(books.id, sourceId)).run();
    }
    else {
        const remaining = state.sourceEditions.find(edition => edition.id !== editionId)!;
        if (state.source.apiId === state.sourceEditions.find(edition => edition.id === editionId)!.apiId) {
            tx.update(books).set({ apiId: remaining.apiId }).where(eq(books.id, sourceId)).run();
        }
        const moved = state.sourceEditions.find(edition => edition.id === editionId)!;
        tx.update(importItems).set({ matchedMediaId: targetId }).where(and(eq(importItems.mediaType, MediaType.BOOKS), eq(importItems.externalApiId, moved.apiId))).run();
    }
    const statsUsers = [...new Set([...affectedUsers, ...state.targetLists.map(row => row.userId)])];
    if (statsUsers.length) StatsRepository.updateAllUsersPreComputedStats(MediaType.BOOKS, createBooksStatistics().computeAllUsersStats(statsUsers));
    return { mediaId: targetId, affectedUsers: statsUsers };
});

export const splitBookEdition = (actorId: number, editionId: number, name: string) => withTransaction(() => {
    const tx = getDbClient();
    const edition = tx.select().from(bookEditions).where(eq(bookEditions.id, editionId)).get();
    if (!edition) throw new FormattedError("Edition not found.");
    const editions = repository.getEditions(edition.mediaId);
    if (editions.length < 2) throw new FormattedError("This edition already has its own work.");
    const source = repository.findById(edition.mediaId)!;
    if (source.apiId === edition.apiId) tx.update(books).set({ apiId: editions.find(row => row.id !== editionId)!.apiId }).where(eq(books.id, source.id)).run();
    const target = tx.insert(books).values({ name, apiId: edition.apiId, imageCover: edition.imageCover, synopsis: source.synopsis }).returning().get();
    if (edition.authors.length) tx.insert(booksAuthors).values(edition.authors.map(name => ({ mediaId: target.id, name }))).onConflictDoNothing().run();
    const preview = previewBookMerge(source.id, target.id, editionId);
    const result = mergeBookWorks(actorId, { sourceId: source.id, targetId: target.id, editionId, version: preview.version, metadata: "target", resolutions: [] });
    keepBookWorksSeparate(actorId, source.id, target.id);
    return result;
});
