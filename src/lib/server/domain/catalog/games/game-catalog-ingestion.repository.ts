import {and, eq, inArray, sql} from "drizzle-orm";
import {getImageFilename} from "@/lib/utils/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {UpsertGameWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    gameCompany,
    gameDetails,
    gamePlatform,
} from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";


/** Adapter from the retained IGDB/HLTB transformer into the concrete game catalog. */
export class GameCatalogIngestionRepository implements MediaIngestionRepository<UpsertGameWithDetails> {
    async findByApiId(apiId: number | string) {
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                eq(catalogItem.primaryProvider, "igdb"),
                eq(catalogItem.primaryExternalId, String(apiId)),
            )).get();
    }

    async findByApiIds(apiIds: (number | string)[]) {
        if (apiIds.length === 0) return [];
        return getDbClient().select({ id: catalogItem.id, apiId: catalogItem.primaryExternalId })
            .from(catalogItem).where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                eq(catalogItem.primaryProvider, "igdb"),
                inArray(catalogItem.primaryExternalId, apiIds.map(String)),
            ));
    }

    async findByNames(names: string[]) {
        if (names.length === 0) return [];
        return getDbClient()
            .select({ id: catalogItem.id, name: catalogItem.name, releaseDate: catalogItem.releaseDate })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                inArray(sql<string>`lower(trim(${catalogItem.name}))`, names),
            ));
    }

    storeMediaWithDetails(details: UpsertGameWithDetails) {
        return this.persist(details, "store");
    }

    async updateMediaWithDetails(details: UpsertGameWithDetails) {
        if (!await this.findByApiId(details.mediaData.apiId)) return false;
        await this.persist(details, "refresh");
        return true;
    }

    private async persist(details: UpsertGameWithDetails, mode: "store" | "refresh") {
        const media = details.mediaData;
        const apiId = String(media.apiId);
        const [item] = await getDbClient().insert(catalogItem).values({
            kind: MediaType.GAMES,
            primaryProvider: "igdb",
            primaryExternalId: apiId,
            name: media.name,
            releaseDate: media.releaseDate,
            synopsis: media.synopsis,
            imageCover: getImageFilename(media.imageCover),
            locked: media.lockStatus ?? false,
            lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
        }).onConflictDoUpdate({
            target: [catalogItem.kind, catalogItem.primaryProvider, catalogItem.primaryExternalId],
            set: mode === "refresh" ? {
                name: media.name,
                releaseDate: media.releaseDate,
                synopsis: media.synopsis,
                imageCover: getImageFilename(media.imageCover),
                lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
            } : { lastProviderUpdate: sql`CURRENT_TIMESTAMP` },
        }).returning({ id: catalogItem.id });

        await getDbClient().insert(gameDetails).values({
            catalogItemId: item.id,
            gameEngine: media.gameEngine,
            gameModes: media.gameModes,
            playerPerspective: media.playerPerspective,
            voteAverage: media.voteAverage,
            voteCount: media.voteCount,
            igdbUrl: media.igdbUrl,
            hltbMainHours: normalizeHltbHours(media.hltbMainTime),
            hltbMainExtraHours: normalizeHltbHours(media.hltbMainAndExtraTime),
            hltbCompletionistHours: normalizeHltbHours(media.hltbTotalCompleteTime),
            steamAppId: media.steamApiId,
            collectionExternalId: media.collectionId,
        }).onConflictDoUpdate({
            target: gameDetails.catalogItemId,
            set: {
                gameEngine: media.gameEngine,
                gameModes: media.gameModes,
                playerPerspective: media.playerPerspective,
                voteAverage: media.voteAverage,
                voteCount: media.voteCount,
                igdbUrl: media.igdbUrl,
                hltbMainHours: normalizeHltbHours(media.hltbMainTime),
                hltbMainExtraHours: normalizeHltbHours(media.hltbMainAndExtraTime),
                hltbCompletionistHours: normalizeHltbHours(media.hltbTotalCompleteTime),
                steamAppId: media.steamApiId,
                collectionExternalId: media.collectionId,
            },
        });

        await Promise.all([
            this.syncPlatforms(item.id, details.platformsData, mode),
            this.syncCompanies(item.id, details.companiesData, mode),
            this.syncGenres(item.id, details.genresData, mode),
        ]);
        return item.id;
    }

    private async syncPlatforms(catalogItemId: number, rows: { name: string }[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        if (mode === "refresh") await getDbClient().delete(gamePlatform).where(eq(gamePlatform.catalogItemId, catalogItemId));
        await getDbClient().insert(gamePlatform).values(names.map((name) => ({ catalogItemId, name }))).onConflictDoNothing();
    }

    private async syncCompanies(
        catalogItemId: number,
        rows: { name: string; developer: boolean; publisher: boolean }[] | undefined,
        mode: "store" | "refresh",
    ) {
        const companies = mergeCompanies(rows);
        if (companies.length === 0) return;
        if (mode === "refresh") await getDbClient().delete(gameCompany).where(eq(gameCompany.catalogItemId, catalogItemId));
        await getDbClient().insert(gameCompany)
            .values(companies.map((company) => ({ catalogItemId, ...company }))).onConflictDoNothing();
    }

    private async syncGenres(catalogItemId: number, rows: { name: string }[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;
        await getDbClient().insert(catalogGenre).values(names.map((name) => ({ name }))).onConflictDoNothing();
        const genres = await getDbClient().select().from(catalogGenre).where(inArray(catalogGenre.name, names));
        if (mode === "refresh") await getDbClient().delete(catalogItemGenre).where(eq(catalogItemGenre.catalogItemId, catalogItemId));
        await getDbClient().insert(catalogItemGenre)
            .values(genres.map(({ id }) => ({ catalogItemId, genreId: id }))).onConflictDoNothing();
    }
}


const normalizeHltbHours = (value: unknown) => {
    const number = typeof value === "number" ? value : Number.NaN;
    return Number.isFinite(number) && number >= 0 ? number : null;
};


const uniqueNames = (rows?: { name: string }[]) => [...new Set((rows ?? []).map(({ name }) => name.trim()).filter(Boolean))];


const mergeCompanies = (rows?: { name: string; developer: boolean; publisher: boolean }[]) => {
    const companies = new Map<string, { name: string; developer: boolean; publisher: boolean }>();
    for (const row of rows ?? []) {
        const name = row.name.trim();
        if (!name) continue;
        const existing = companies.get(name);
        companies.set(name, {
            name,
            developer: !!row.developer || !!existing?.developer,
            publisher: !!row.publisher || !!existing?.publisher,
        });
    }
    return [...companies.values()];
};
