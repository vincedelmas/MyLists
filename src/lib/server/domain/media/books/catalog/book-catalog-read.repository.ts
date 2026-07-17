import {getImageUrl} from "@/lib/utils/image-url";
import {JobType, MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, desc, eq, inArray, like, ne, sql} from "drizzle-orm";
import {bookAuthor, bookDetails, catalogGenre, catalogItem, catalogItemGenre, libraryEntry,} from "@/lib/server/database/schema";


/** Book-specific catalog projection for the existing detail-page contract. */
export class BookCatalogReadRepository {
    async searchByName(query: string, limit = 5) {
        const rows = await getDbClient()
            .select({
                name: catalogItem.name,
                image: catalogItem.imageCover,
                date: catalogItem.releaseDate,
                id: catalogItem.primaryExternalId,
            }).from(catalogItem)
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), like(catalogItem.name, `%${query.toLowerCase()}%`)))
            .orderBy(catalogItem.name)
            .limit(limit);

        return rows.map(({ image, ...row }) => ({
            ...row,
            itemType: MediaType.BOOKS,
            image: getImageUrl("books-covers", image),
        }));
    }

    async findDetails(catalogItemId: number) {
        const details = getDbClient()
            .select({
                catalogItemId: catalogItem.id,
                id: catalogItem.id,
                name: catalogItem.name,
                releaseDate: catalogItem.releaseDate,
                synopsis: catalogItem.synopsis,
                imageCover: catalogItem.imageCover,
                lockStatus: catalogItem.locked,
                addedAt: catalogItem.addedAt,
                lastApiUpdate: catalogItem.lastProviderUpdate,
                apiId: catalogItem.primaryExternalId,
                pages: bookDetails.pages,
                language: bookDetails.language,
                publishers: bookDetails.publisher,
            }).from(catalogItem)
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.id, catalogItemId), eq(catalogItem.kind, MediaType.BOOKS)))
            .get();

        if (!details) return;

        const [genres, authors] = await Promise.all([
            getDbClient()
                .select({ id: catalogGenre.id, name: catalogGenre.name })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(eq(catalogItemGenre.catalogItemId, details.catalogItemId))
                .orderBy(catalogGenre.id),
            getDbClient()
                .select({ id: bookAuthor.id, name: bookAuthor.name })
                .from(bookAuthor)
                .where(eq(bookAuthor.catalogItemId, details.catalogItemId))
                .orderBy(bookAuthor.position, bookAuthor.id),
        ]);

        const { catalogItemId: _, imageCover, ...media } = details;

        return {
            ...media,
            genres,
            authors,
            imageCover: getImageUrl("books-covers", imageCover),
            providerData: {
                name: "GoogleBooks",
                url: `https://books.google.com/books?id=${details.apiId}`,
            },
        };
    }

    async findSimilar(catalogItemId: number) {
        const target = getDbClient()
            .select({ catalogItemId: catalogItem.id })
            .from(catalogItem)
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), eq(catalogItem.id, catalogItemId)))
            .get();

        if (!target) return [];

        const genreIds = await getDbClient()
            .select({ genreId: catalogItemGenre.genreId })
            .from(catalogItemGenre)
            .where(eq(catalogItemGenre.catalogItemId, target.catalogItemId));

        if (genreIds.length === 0) return [];

        return getDbClient()
            .select({
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                commonGenreCount: count(catalogItemGenre.genreId),
            }).from(catalogItemGenre)
            .innerJoin(catalogItem, eq(catalogItem.id, catalogItemGenre.catalogItemId))
            .where(and(
                eq(catalogItem.kind, MediaType.BOOKS),
                ne(catalogItem.id, target.catalogItemId),
                inArray(catalogItemGenre.genreId, genreIds.map(({ genreId }) => genreId)),
            ))
            .groupBy(catalogItem.id)
            .orderBy(desc(sql`count(${catalogItemGenre.genreId})`), asc(catalogItem.id))
            .limit(10)
            .then((rows) => rows.map(({ imageCover, commonGenreCount: _, ...row }) => ({
                ...row,
                mediaCover: getImageUrl("books-covers", imageCover),
            })));
    }

    async getMediaJobDetails(job: JobType, name: string, offset: number, limit: number, viewerId?: number) {
        if (job !== JobType.CREATOR) return { kind: MediaType.BOOKS, items: [], total: 0, pages: 0 };
        const matchingIds = getDbClient().select({ catalogItemId: bookAuthor.catalogItemId }).from(bookAuthor)
            .where(like(bookAuthor.name, `%${name}%`));
        const conditions = and(eq(catalogItem.kind, MediaType.BOOKS), inArray(catalogItem.id, matchingIds));
        const [rows, totalRow] = await Promise.all([
            getDbClient().selectDistinct({
                catalogItemId: catalogItem.id,
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                releaseDate: catalogItem.releaseDate,
            }).from(catalogItem)
                .where(conditions)
                .orderBy(asc(catalogItem.releaseDate))
                .limit(limit)
                .offset(offset),
            getDbClient().select({ value: count() }).from(catalogItem).where(conditions).get(),
        ]);
        const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);
        const viewerEntries = viewerId && catalogItemIds.length > 0
            ? await getDbClient().select({ catalogItemId: libraryEntry.catalogItemId }).from(libraryEntry)
                .where(and(eq(libraryEntry.userId, viewerId), inArray(libraryEntry.catalogItemId, catalogItemIds)))
            : [];
        const viewerCatalogIds = new Set(viewerEntries.map(({ catalogItemId }) => catalogItemId));
        const total = totalRow?.value ?? 0;
        return {
            kind: MediaType.BOOKS,
            items: rows.map(({ catalogItemId, imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl("books-covers", imageCover),
                inUserList: viewerCatalogIds.has(catalogItemId),
            })),
            total,
            pages: Math.ceil(total / limit),
        };
    }
}
