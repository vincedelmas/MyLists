import {and, asc, count, desc, eq, inArray, like, ne, sql} from "drizzle-orm";
import {JobType, MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    mangaAuthor,
    mangaDetails,
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    libraryEntry,
} from "@/lib/server/database/schema";


/** Manga-specific catalog projection for the existing detail-page contract. */
export class MangaCatalogReadRepository {
    async findDetails(catalogItemId: number) {
        const details = await getDbClient().select({
            catalogItemId: catalogItem.id,
            id: catalogItem.id,
            name: catalogItem.name,
            releaseDate: catalogItem.releaseDate,
            synopsis: catalogItem.synopsis,
            imageCover: catalogItem.imageCover,
            lockStatus: catalogItem.locked,
            addedAt: catalogItem.addedAt,
            lastApiUpdate: catalogItem.lastProviderUpdate,
            apiId: sql<number>`cast(${catalogItem.primaryExternalId} as integer)`,
            originalName: mangaDetails.originalName,
            chapters: mangaDetails.chapters,
            prodStatus: mangaDetails.productionStatus,
            siteUrl: mangaDetails.siteUrl,
            endDate: mangaDetails.endDate,
            volumes: mangaDetails.volumes,
            voteAverage: mangaDetails.voteAverage,
            voteCount: mangaDetails.voteCount,
            popularity: mangaDetails.popularity,
            publishers: mangaDetails.publisher,
        }).from(catalogItem)
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.id, catalogItemId),
                eq(catalogItem.kind, MediaType.MANGA),
            )).get();
        if (!details) return;

        const [genres, authors] = await Promise.all([
            getDbClient().select({ id: catalogGenre.id, name: catalogGenre.name })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(eq(catalogItemGenre.catalogItemId, details.catalogItemId))
                .orderBy(catalogGenre.id),
            getDbClient().select({ id: mangaAuthor.id, name: mangaAuthor.name })
                .from(mangaAuthor)
                .where(eq(mangaAuthor.catalogItemId, details.catalogItemId))
                .orderBy(mangaAuthor.id),
        ]);
        const { catalogItemId: _, imageCover, ...media } = details;
        return {
            ...media,
            imageCover: getImageUrl("manga-covers", imageCover),
            genres,
            authors,
            providerData: {
                name: "MyAnimeList",
                url: `https://myanimelist.net/manga/${details.apiId}`,
            },
        };
    }

    async findSimilar(catalogItemId: number) {
        const target = await getDbClient().select({ catalogItemId: catalogItem.id })
            .from(catalogItem).where(and(eq(catalogItem.kind, MediaType.MANGA), eq(catalogItem.id, catalogItemId))).get();
        if (!target) return [];
        const genreIds = await getDbClient().select({ genreId: catalogItemGenre.genreId })
            .from(catalogItemGenre).where(eq(catalogItemGenre.catalogItemId, target.catalogItemId));
        if (genreIds.length === 0) return [];

        return getDbClient().select({
            mediaId: catalogItem.id,
            mediaName: catalogItem.name,
            imageCover: catalogItem.imageCover,
            commonGenreCount: count(catalogItemGenre.genreId),
        }).from(catalogItemGenre)
            .innerJoin(catalogItem, eq(catalogItem.id, catalogItemGenre.catalogItemId))
            .where(and(
                eq(catalogItem.kind, MediaType.MANGA),
                ne(catalogItem.id, target.catalogItemId),
                inArray(catalogItemGenre.genreId, genreIds.map(({ genreId }) => genreId)),
            ))
            .groupBy(catalogItem.id)
            .orderBy(desc(sql`count(${catalogItemGenre.genreId})`), asc(catalogItem.id))
            .limit(10)
            .then((rows) => rows.map(({ imageCover, commonGenreCount: _, ...row }) => ({
                ...row,
                mediaCover: getImageUrl("manga-covers", imageCover),
            })));
    }

    async getMediaJobDetails(job: JobType, name: string, offset: number, limit: number, viewerId?: number) {
        const conditions = job === JobType.CREATOR
            ? and(
                eq(catalogItem.kind, MediaType.MANGA),
                inArray(catalogItem.id, getDbClient().select({ catalogItemId: mangaAuthor.catalogItemId })
                    .from(mangaAuthor).where(like(mangaAuthor.name, `%${name}%`))),
            )
            : job === JobType.PUBLISHER
                ? and(eq(catalogItem.kind, MediaType.MANGA), like(mangaDetails.publisher, `%${name}%`))
                : undefined;
        if (!conditions) return { kind: MediaType.MANGA, items: [], total: 0, pages: 0 };
        const [rows, totalRow] = await Promise.all([
            getDbClient().selectDistinct({
                catalogItemId: catalogItem.id,
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                releaseDate: catalogItem.releaseDate,
            }).from(catalogItem)
                .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
                .where(conditions)
                .orderBy(asc(catalogItem.releaseDate))
                .limit(limit)
                .offset(offset),
            getDbClient().select({ value: count() }).from(catalogItem)
                .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
                .where(conditions).get(),
        ]);
        const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);
        const viewerEntries = viewerId && catalogItemIds.length > 0
            ? await getDbClient().select({ catalogItemId: libraryEntry.catalogItemId }).from(libraryEntry)
                .where(and(eq(libraryEntry.userId, viewerId), inArray(libraryEntry.catalogItemId, catalogItemIds)))
            : [];
        const viewerCatalogIds = new Set(viewerEntries.map(({ catalogItemId }) => catalogItemId));
        const total = totalRow?.value ?? 0;
        return {
            kind: MediaType.MANGA,
            items: rows.map(({ catalogItemId, imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl("manga-covers", imageCover),
                inUserList: viewerCatalogIds.has(catalogItemId),
            })),
            total,
            pages: Math.ceil(total / limit),
        };
    }
}
