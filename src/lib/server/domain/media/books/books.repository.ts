import {Status} from "@/lib/utils/enums";
import {eq, getTableColumns, isNull, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {books, booksAuthors, booksGenre, booksList} from "@/lib/server/database/schema";
import {BookServerDefinition, booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {Book, InsertBooksWithDetails, UpdateBooksWithDetails} from "@/lib/server/domain/media/books/books.types";


export class BooksRepository extends BaseRepository<BookServerDefinition> {
    constructor(definition: BookServerDefinition = booksServerDefinition) {
        super(definition);
    }

    async getBooksWithoutGenres() {
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

    // --- Implemented Methods ------------------------------------------------

    async addMediaToUserList(userId: number, media: Book, newStatus: Status) {
        const newTotal = (newStatus === Status.COMPLETED) ? media.pages : 0;

        const [newMedia] = await getDbClient()
            .insert(booksList)
            .values({
                userId,
                total: newTotal,
                status: newStatus,
                mediaId: media.id,
                actualPage: newTotal,
            })
            .returning();

        return newMedia;
    }

    async findAllAssociatedDetails(mediaId: number) {
        const details = getDbClient()
            .select({
                ...getTableColumns(books),
                authors: sql`json_group_array(DISTINCT json_object('id', ${booksAuthors.id}, 'name', ${booksAuthors.name}))`.mapWith(JSON.parse),
                genres: sql`json_group_array(DISTINCT json_object('id', ${booksGenre.id}, 'name', ${booksGenre.name}))`.mapWith(JSON.parse),
            }).from(books)
            .leftJoin(booksAuthors, eq(booksAuthors.mediaId, books.id))
            .leftJoin(booksGenre, eq(booksGenre.mediaId, books.id))
            .where(eq(books.id, mediaId))
            .groupBy(...Object.values(getTableColumns(books)))
            .get();

        if (!details) return;

        const result: Book & AddedMediaDetails = {
            ...details,
            providerData: {
                name: this.attribution.name,
                url: `${this.attribution.mediaUrl}${details.apiId}`,
            },
            genres: details.genres || [],
            authors: details.authors || [],
        };

        return result;
    }

    async storeMediaWithDetails({ mediaData, authorsData }: InsertBooksWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .insert(books)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: books.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning();

        const mediaId = media.id;
        if (authorsData && authorsData.length > 0) {
            const authorsToAdd = authorsData.map(a => ({ mediaId, ...a }));
            await tx.insert(booksAuthors).values(authorsToAdd).onConflictDoNothing();
        }

        return mediaId;
    }

    async updateMediaWithDetails({ mediaData, authorsData, genresData }: UpdateBooksWithDetails) {
        const tx = getDbClient();

        const [media] = await tx
            .update(books)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(books.apiId, mediaData.apiId))
            .returning({ id: books.id });

        const mediaId = media.id;

        if (authorsData !== undefined) {
            await tx
                .delete(booksAuthors)
                .where(eq(booksAuthors.mediaId, mediaId));

            if (authorsData.length > 0) {
                await tx
                    .insert(booksAuthors)
                    .values(authorsData.map(author => ({ mediaId, ...author })))
                    .onConflictDoNothing();
            }
        }

        if (genresData !== undefined) {
            await tx
                .delete(booksGenre)
                .where(eq(booksGenre.mediaId, mediaId));

            if (genresData.length > 0) {
                await tx
                    .insert(booksGenre)
                    .values(genresData.map(genre => ({ mediaId, ...genre })))
                    .onConflictDoNothing();
            }
        }

        return true;
    }
}
