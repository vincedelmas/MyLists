import {FormattedError} from "@/lib/utils/error-classes";
import {bookMatchEvidence} from "@/lib/server/domain/media/books/book-matching";
import {MediaType, Status} from "@/lib/utils/enums";
import {asc, eq, getTableColumns, inArray, isNull, like, or, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails, IdNamePair} from "@/lib/types/media-common.types";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {bookEditions, books, booksAuthors, booksGenre, booksList} from "@/lib/server/database/schema";
import {BookServerDefinition, booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {Book, InsertBooksWithDetails, UpdateBooksWithDetails} from "@/lib/server/domain/media/books/books.types";


export function createBooksRepository(definition: BookServerDefinition = booksServerDefinition) {
    const { attribution } = definition;
    const queries = createMediaQueries(definition);

    async function getBooksWithoutGenres() {
        return getDbClient()
            .select({
                title: books.name,
                apiId: books.apiId,
                synopsis: books.synopsis,
                authors: sql<string>`group_concat(${booksAuthors.name}, ', ')`,
            })
            .from(books)
            .leftJoin(booksAuthors, eq(booksAuthors.mediaId, books.id))
            .leftJoin(booksGenre, eq(booksGenre.mediaId, books.id))
            .where(isNull(booksGenre.mediaId))
            .groupBy(books.id);
    }

    function getEditions(mediaId: number) {
        return getDbClient().select().from(bookEditions).where(eq(bookEditions.mediaId, mediaId)).orderBy(asc(bookEditions.id)).all();
    }

    function findEditionByApiId(apiId: string | number) {
        return getDbClient().select().from(bookEditions).where(eq(bookEditions.apiId, String(apiId))).get();
    }

    function getEditionSnapshot(mediaId: number, editionId?: number | null) {
        const edition = editionId === null ? undefined : editionId === undefined
            ? getEditions(mediaId)[0]
            : getDbClient().select().from(bookEditions).where(eq(bookEditions.id, editionId)).get();
        if (editionId != null && (!edition || edition.mediaId !== mediaId)) {
            throw new FormattedError("This edition does not belong to this work.");
        }
        return {
            editionId: edition?.id ?? null,
            pages: edition?.pages ?? null,
            language: edition?.language ?? null,
            publishers: edition?.publishers ?? null,
            editionName: edition?.name ?? null,
        };
    }

    function addMediaToUserList(userId: number, media: Book, newStatus: Status, editionId?: number | null) {
        const snapshot = getEditionSnapshot(media.id, editionId);
        if (newStatus === Status.COMPLETED && snapshot.pages === null) {
            throw new FormattedError("Choose an edition and enter its page count before marking this book completed.");
        }
        const newTotal = newStatus === Status.COMPLETED ? snapshot.pages! : 0;
        return getDbClient().insert(booksList).values({
            userId, mediaId: media.id, status: newStatus, total: newTotal, actualPage: newTotal, ...snapshot,
        }).returning().get();
    }

    async function findByApiId(apiId: string | number) {
        const edition = findEditionByApiId(apiId);
        return edition ? queries.findById(edition.mediaId) : undefined;
    }

    async function findByApiIds(apiIds: (string | number)[]) {
        const result: { id: number; apiId: string; editionId: number }[] = [];
        const ids = [...new Set(apiIds.map(String))];
        for (let offset = 0; offset < ids.length; offset += 300) {
            result.push(...getDbClient().select({ id: bookEditions.mediaId, apiId: bookEditions.apiId, editionId: bookEditions.id })
                .from(bookEditions).where(inArray(bookEditions.apiId, ids.slice(offset, offset + 300))).all());
        }
        return result;
    }

    async function searchByName(query: string, limit = 5) {
        const rows = getDbClient().selectDistinct({ id: books.apiId, mediaId: books.id, name: books.name, image: books.imageCover, date: books.releaseDate })
            .from(books).leftJoin(bookEditions, eq(bookEditions.mediaId, books.id))
            .where(or(like(books.name, `%${query}%`), like(bookEditions.name, `%${query}%`)))
            .orderBy(asc(books.name)).limit(limit).all();
        return rows.map(row => ({ ...row, itemType: MediaType.BOOKS }));
    }

    async function downloadMediaListAsCSV(userId: number) {
        return getDbClient().select({
            ...getTableColumns(booksList), mediaName: books.name,
            externalApiId: sql<string>`COALESCE(${bookEditions.apiId}, ${books.apiId})`,
            editionApiId: bookEditions.apiId,
            releaseDate: bookEditions.releaseDate,
        }).from(booksList).innerJoin(books, eq(books.id, booksList.mediaId))
            .leftJoin(bookEditions, eq(bookEditions.id, booksList.editionId))
            .where(eq(booksList.userId, userId)).all();
    }

    async function findAllAssociatedDetails(mediaId: number) {
        const details = getDbClient()
            .select({
                ...getTableColumns(books),
                authors: sql`json_group_array(DISTINCT json_object('id', ${booksAuthors.id}, 'name', ${booksAuthors.name}))
                    FILTER (WHERE ${booksAuthors.id} IS NOT NULL)`.mapWith((value): IdNamePair[] => JSON.parse(value)),
                genres: sql`json_group_array(DISTINCT json_object('id', ${booksGenre.id}, 'name', ${booksGenre.name}))
                    FILTER (WHERE ${booksGenre.id} IS NOT NULL)`.mapWith((value): IdNamePair[] => JSON.parse(value)),
            }).from(books)
            .leftJoin(booksAuthors, eq(booksAuthors.mediaId, books.id))
            .leftJoin(booksGenre, eq(booksGenre.mediaId, books.id))
            .where(eq(books.id, mediaId))
            .groupBy(...Object.values(getTableColumns(books)))
            .get();

        if (!details) return;

        const result = {
            ...details,
            providerData: {
                name: attribution.name,
                url: `${attribution.mediaUrl}${details.apiId}`,
            },
        } satisfies Book & AddedMediaDetails;

        return result;
    }

    function storeMediaWithDetails({ mediaData, authorsData, editionData }: InsertBooksWithDetails) {
        const tx = getDbClient();
        const existing = findEditionByApiId(editionData.apiId);
        if (existing) return existing.mediaId;

        const candidates = editionData.isbns?.length || editionData.openLibraryWorkId
            ? tx.select().from(bookEditions).where(or(
                editionData.openLibraryWorkId ? eq(bookEditions.openLibraryWorkId, editionData.openLibraryWorkId) : undefined,
                editionData.isbns?.length ? sql`EXISTS (SELECT 1 FROM json_each(${bookEditions.isbns}) WHERE value IN (${sql.join(editionData.isbns.map(isbn => sql`${isbn}`), sql`, `)}))` : undefined,
            )).all()
            : [];
        const matches = new Set(candidates.filter(candidate => {
            const evidence = bookMatchEvidence({ ...editionData, authors: editionData.authors ?? [], isbns: editionData.isbns ?? [] }, candidate);
            return evidence === "ISBN" || evidence === "Open Library work";
        }).map(candidate => candidate.mediaId));

        let mediaId: number;
        if (matches.size === 1) {
            mediaId = [...matches][0];
        }
        else {
            mediaId = tx.insert(books).values({ ...mediaData, lastApiUpdate: sql`datetime('now')` }).returning({ id: books.id }).get().id;
            if (authorsData?.length) {
                tx.insert(booksAuthors).values(authorsData.map(author => ({ mediaId, ...author }))).onConflictDoNothing().run();
            }
        }
        tx.insert(bookEditions).values({ ...editionData, mediaId, lastApiUpdate: sql`datetime('now')` }).run();
        return mediaId;
    }

    function updateMediaWithDetails({ mediaData, authorsData, genresData, editionData }: UpdateBooksWithDetails) {
        const tx = getDbClient();

        if (editionData) {
            const edition = findEditionByApiId(editionData.apiId);
            if (!edition) throw new FormattedError("Edition not found.");
            tx.update(bookEditions).set({
                ...editionData,
                imageCover: editionData.imageCover === "default.jpg" ? undefined : editionData.imageCover,
                lastApiUpdate: sql`datetime('now')`,
            }).where(eq(bookEditions.id, edition.id)).run();
            tx.update(books).set({
                lastApiUpdate: sql`datetime('now')`,
                releaseDate: mediaData.releaseDate ? sql`COALESCE(${books.releaseDate}, ${mediaData.releaseDate})` : undefined,
            }).where(eq(books.id, edition.mediaId)).run();
            return true;
        }

        const [media] = tx
            .update(books)
            .set({
                ...mediaData,
                imageCover: mediaData.imageCover === "default.jpg" ? undefined : mediaData.imageCover,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(books.apiId, mediaData.apiId))
            .returning({ id: books.id }).all();

        const mediaId = media.id;

        if (authorsData !== undefined) {
            tx
                .delete(booksAuthors)
                .where(eq(booksAuthors.mediaId, mediaId)).run();

            if (authorsData.length > 0) {
                tx
                    .insert(booksAuthors)
                    .values(authorsData.map(author => ({ mediaId, ...author })))
                    .onConflictDoNothing().run();
            }
        }

        if (genresData !== undefined) {
            tx
                .delete(booksGenre)
                .where(eq(booksGenre.mediaId, mediaId)).run();

            if (genresData.length > 0) {
                tx
                    .insert(booksGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })))
                    .onConflictDoNothing().run();
            }
        }

        return true;
    }

    return {
        ...queries,
        getBooksWithoutGenres,
        getEditions,
        getEditionSnapshot,
        findEditionByApiId,
        findByApiId,
        findByApiIds,
        searchByName,
        downloadMediaListAsCSV,
        addMediaToUserList,
        findAllAssociatedDetails,
        storeMediaWithDetails,
        updateMediaWithDetails,
    };
}


export type BooksRepository = ReturnType<typeof createBooksRepository>;
