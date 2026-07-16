import {and, asc, count, desc, eq, inArray, like, ne, sql} from "drizzle-orm";
import {JobType, MediaType} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {normalizeGamePlatforms} from "@/lib/utils/game-platforms";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    gameCompany,
    gameDetails,
    gamePlatform,
    libraryEntry,
} from "@/lib/server/database/schema";


/** Game-specific catalog projection for the existing detail-page contract. */
export class GameCatalogReadRepository {
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
            apiId: catalogItem.primaryExternalId,
            gameEngine: gameDetails.gameEngine,
            gameModes: gameDetails.gameModes,
            playerPerspective: gameDetails.playerPerspective,
            voteAverage: gameDetails.voteAverage,
            voteCount: gameDetails.voteCount,
            igdbUrl: gameDetails.igdbUrl,
            hltbMainTime: gameDetails.hltbMainHours,
            hltbMainAndExtraTime: gameDetails.hltbMainExtraHours,
            hltbTotalCompleteTime: gameDetails.hltbCompletionistHours,
            steamApiId: gameDetails.steamAppId,
            collectionId: gameDetails.collectionExternalId,
        }).from(catalogItem)
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.id, catalogItemId),
                eq(catalogItem.kind, MediaType.GAMES),
            )).get();
        if (!details) return;

        const [genres, platforms, companies, collection] = await Promise.all([
            getDbClient().select({ id: catalogGenre.id, name: catalogGenre.name })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(eq(catalogItemGenre.catalogItemId, details.catalogItemId))
                .orderBy(catalogGenre.id),
            getDbClient().select({ id: gamePlatform.id, name: gamePlatform.name })
                .from(gamePlatform)
                .where(eq(gamePlatform.catalogItemId, details.catalogItemId))
                .orderBy(gamePlatform.id),
            getDbClient().select({
                id: gameCompany.id,
                name: gameCompany.name,
                developer: gameCompany.developer,
                publisher: gameCompany.publisher,
            }).from(gameCompany)
                .where(eq(gameCompany.catalogItemId, details.catalogItemId))
                .orderBy(gameCompany.id),
            this.findCollection(details.catalogItemId, details.collectionId),
        ]);
        const { catalogItemId: _, apiId, imageCover, ...media } = details;
        return {
            ...media,
            apiId: Number(apiId),
            imageCover: getImageUrl("games-covers", imageCover),
            genres,
            platforms,
            companies,
            collection,
            providerData: {
                name: "IGDB",
                url: details.igdbUrl ?? "#",
            },
        };
    }

    async findSimilar(catalogItemId: number) {
        const target = await getDbClient().select({ catalogItemId: catalogItem.id })
            .from(catalogItem).where(and(eq(catalogItem.kind, MediaType.GAMES), eq(catalogItem.id, catalogItemId))).get();
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
                eq(catalogItem.kind, MediaType.GAMES),
                ne(catalogItem.id, target.catalogItemId),
                inArray(catalogItemGenre.genreId, genreIds.map(({ genreId }) => genreId)),
            ))
            .groupBy(catalogItem.id)
            .orderBy(desc(sql`count(${catalogItemGenre.genreId})`), asc(catalogItem.id))
            .limit(10)
            .then((rows) => rows.map(({ imageCover, commonGenreCount: _, ...row }) => ({
                ...row,
                mediaCover: getImageUrl("games-covers", imageCover),
            })));
    }

    async getCompatiblePlatforms(catalogItemId: number) {
        const rows = await getDbClient().select({ name: gamePlatform.name })
            .from(gamePlatform)
            .where(eq(gamePlatform.catalogItemId, catalogItemId));
        return normalizeGamePlatforms(rows);
    }

    async getMediaJobDetails(job: JobType, name: string, offset: number, limit: number, viewerId?: number) {
        const matchingIds = this.jobCatalogIds(job, name);
        if (!matchingIds) return { items: [], total: 0, pages: 0 };
        const conditions = and(eq(catalogItem.kind, MediaType.GAMES), inArray(catalogItem.id, matchingIds));
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
            items: rows.map(({ catalogItemId, imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl("games-covers", imageCover),
                inUserList: viewerCatalogIds.has(catalogItemId),
            })),
            total,
            pages: Math.ceil(total / limit),
        };
    }

    private findCollection(catalogItemId: number, collectionId: number | null) {
        if (collectionId === null) return Promise.resolve([]);
        return getDbClient().select({
            mediaId: catalogItem.id,
            mediaName: catalogItem.name,
            mediaCover: catalogItem.imageCover,
        }).from(gameDetails)
            .innerJoin(catalogItem, eq(catalogItem.id, gameDetails.catalogItemId))
            .where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                eq(gameDetails.collectionExternalId, collectionId),
                ne(catalogItem.id, catalogItemId),
            ))
            .orderBy(asc(catalogItem.releaseDate), asc(catalogItem.id))
            .then((rows) => rows.map(({ mediaCover, ...row }) => ({
                ...row,
                mediaCover: getImageUrl("games-covers", mediaCover),
            })));
    }

    private jobCatalogIds(job: JobType, name: string) {
        if (job === JobType.CREATOR) {
            return getDbClient().select({ catalogItemId: gameCompany.catalogItemId }).from(gameCompany)
                .where(and(like(gameCompany.name, `%${name}%`), eq(gameCompany.developer, true)));
        }
        if (job === JobType.PUBLISHER) {
            return getDbClient().select({ catalogItemId: gameCompany.catalogItemId }).from(gameCompany)
                .where(and(like(gameCompany.name, `%${name}%`), eq(gameCompany.publisher, true)));
        }
    }
}
