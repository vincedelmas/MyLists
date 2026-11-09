import {Status} from "@/lib/utils/enums";
import {eq, getTableColumns, isNull, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {books, booksAuthors, booksGenre, booksList} from "@/lib/server/database/schema";
import {mediaRelationArray} from "@/lib/server/domain/media/base/media-relations.queries";
import {Book, InsertBooksWithDetails, UpdateBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {isManualBookId, BookServerDefinition, booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";


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

    function addMediaToUserList(userId: number, media: Book, newStatus: Status) {
        const newTotal = (newStatus === Status.COMPLETED) ? media.pages : 0;

        const [newMedia] = getDbClient()
            .insert(booksList)
            .values({
                userId,
                total: newTotal,
                status: newStatus,
                mediaId: media.id,
                actualPage: newTotal,
            })
            .returning().all();

        return newMedia;
    }

    async function findAllAssociatedDetails(mediaId: number) {
        const details = getDbClient()
            .select({
                ...getTableColumns(books),
                authors: mediaRelationArray(booksAuthors, books.id, { id: booksAuthors.id, name: booksAuthors.name }, booksAuthors.id),
                genres: mediaRelationArray(booksGenre, books.id, { id: booksGenre.id, name: booksGenre.name }, booksGenre.id),
            }).from(books)
            .where(eq(books.id, mediaId))
            .get();

        if (!details) return;

        const result = {
            ...details,
            providerData: isManualBookId(details.apiId)
                ? null
                : {
                    name: attribution.name,
                    url: `${attribution.mediaUrl}${details.apiId}`,
                },
        } satisfies Book & AddedMediaDetails;

        return result;
    }

    function storeMediaWithDetails({ mediaData, authorsData, genresData }: InsertBooksWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .insert(books)
            .values({
                ...mediaData,
                lastApiUpdate: isManualBookId(mediaData.apiId) ? null : sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: books.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning().all();

        const mediaId = media.id;

        if (genresData && genresData.length > 0) {
            tx.insert(booksGenre)
                .values(genresData.map(genre => ({ mediaId, ...genre })))
                .onConflictDoNothing()
                .run();
        }

        if (authorsData && authorsData.length > 0) {
            const authorsToAdd = authorsData.map(a => ({ mediaId, ...a }));
            tx.insert(booksAuthors)
                .values(authorsToAdd)
                .onConflictDoNothing()
                .run();
        }

        return mediaId;
    }

    function updateMediaWithDetails({ mediaData, authorsData, genresData }: UpdateBooksWithDetails) {
        const tx = getDbClient();

        const [media] = tx
            .update(books)
            .set({
                ...mediaData,
                lastApiUpdate: isManualBookId(mediaData.apiId) ? null : sql`datetime('now')`,
                imageCover: mediaData.imageCover === "default.jpg" ? undefined : mediaData.imageCover,
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
        addMediaToUserList,
        findAllAssociatedDetails,
        storeMediaWithDetails,
        updateMediaWithDetails,
    };
}


export type BooksRepository = ReturnType<typeof createBooksRepository>;
