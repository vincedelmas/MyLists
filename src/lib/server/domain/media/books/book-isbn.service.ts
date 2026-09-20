import {eq, sql} from "drizzle-orm";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";
import {bookEditions, booksAuthors} from "@/lib/server/database/schema";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {formatDateForDb} from "@/lib/utils/formatting/date";
import {bookAuthorReviewKey, bookMatchEvidence, conflictingBookVariants, normalizeIsbn} from "./book-matching";
import {createBooksRepository} from "./books.repository";
import {syncBookPublicationDate} from "./book-publication-date";
import {recordBookCandidate} from "./book-review.service";
import type {GBooksApi} from "@/lib/server/api-providers/api/gbooks.api";
import type {CacheManager} from "@/lib/server/core/cache-manager";
import type {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import type {UpsertBooksWithDetails} from "./books.types";

export function createBookIsbnService(api: GBooksApi, provider: ExternalMediaProvider<UpsertBooksWithDetails>, cache: Pick<CacheManager, "wrap">) {
    const repository = createBooksRepository();

    async function search(mediaId: number, value: string) {
        const isbn = normalizeIsbn(value);
        if (!isbn) throw new FormattedError("Enter a valid ISBN-10 or ISBN-13.");
        if (!repository.findById(mediaId)) throw new FormattedError("This book no longer exists.");
        const local = getDbClient().select().from(bookEditions).where(sql`EXISTS (SELECT 1 FROM json_each(${bookEditions.isbns}) WHERE value = ${isbn})`).all();
        if (local.length) return {isbn, editions: local.map(edition => ({apiId: edition.apiId, mediaId: edition.mediaId, name: edition.name,
            authors: edition.authors, publishers: edition.publishers, pages: edition.pages, language: edition.language, releaseDate: edition.releaseDate, imageCover: edition.imageCover}))};
        const result = await cache.wrap(`book-isbn-search:${isbn}`, () => api.search(`isbn:${isbn}`), {ttl: 24 * 60 * 60 * 1000});
        const editions = (result.rawData.items ?? []).filter(item => item.volumeInfo.industryIdentifiers?.some(id =>
            (id.type === "ISBN_10" || id.type === "ISBN_13") && normalizeIsbn(id.identifier) === isbn)).map(item => ({
            apiId: item.id, mediaId: null, name: [item.volumeInfo.title, item.volumeInfo.subtitle].filter(Boolean).join(": "),
            authors: item.volumeInfo.authors ?? [], publishers: item.volumeInfo.publisher ?? null, pages: item.volumeInfo.pageCount || null,
            language: item.volumeInfo.language ?? null, releaseDate: formatDateForDb(item.volumeInfo.publishedDate),
            imageCover: item.volumeInfo.imageLinks?.thumbnail ?? getImageUrl("books-covers"),
        }));
        return {isbn, editions};
    }

    async function select(mediaId: number, value: string, apiId: string) {
        const isbn = normalizeIsbn(value);
        if (!isbn) throw new FormattedError("Enter a valid ISBN-10 or ISBN-13.");
        if (!repository.findById(mediaId)) throw new FormattedError("This book no longer exists.");
        const existing = repository.findEditionByApiId(apiId);
        // Old imported volumes may lack ISBN metadata. Verify those against Google before accepting them.
        const details = existing?.isbns.includes(isbn) ? null : await provider.getDetails(apiId);
        if (details && !details.editionData.isbns?.includes(isbn)) throw new FormattedError("This edition does not match that ISBN. Search again.");
        return withTransaction(() => {
            const tx = getDbClient();
            const work = repository.findById(mediaId);
            if (!work) throw new FormattedError("This book changed. Reload its page.");
            const authors = tx.select({name: booksAuthors.name}).from(booksAuthors).where(eq(booksAuthors.mediaId, mediaId)).all().map(row => row.name);
            const workIdentity = {name: work.name, authors, isbns: []};
            const edition = repository.findEditionByApiId(apiId);
            let resolvedId: number;
            if (edition) {
                if (details) repository.updateMediaWithDetails(details);
                resolvedId = edition.mediaId;
            }
            else {
                const data = details!.editionData;
                const identity = {...data, authors: data.authors ?? [], isbns: data.isbns ?? []};
                const compatible = [workIdentity, ...repository.getEditions(mediaId)].some(candidate => bookMatchEvidence(identity, candidate));
                if (compatible) {
                    tx.insert(bookEditions).values({...data, mediaId, lastApiUpdate: sql`CURRENT_TIMESTAMP`}).run();
                    syncBookPublicationDate(mediaId);
                    resolvedId = mediaId;
                }
                else resolvedId = repository.storeMediaWithDetails(details!);
            }
            const selected = repository.findEditionByApiId(apiId)!;
            let reviewQueued = false;
            if (resolvedId !== mediaId && !conflictingBookVariants(work.name, selected.name)) {
                const authorKeys = new Set(authors.map(bookAuthorReviewKey));
                if (!authors.length || !selected.authors.length || selected.authors.some(author => authorKeys.has(bookAuthorReviewKey(author)))) {
                    reviewQueued = recordBookCandidate(mediaId, resolvedId, 50, ["Reader requested this edition for the work", "Work association needs review"], "reader");
                }
            }
            return {mediaId: resolvedId, editionId: selected.id, pages: selected.pages, reviewQueued};
        });
    }

    return {search, select};
}
