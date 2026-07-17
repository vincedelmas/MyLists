import {getImageFilename} from "@/lib/utils/image-url";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {and, eq, inArray, notInArray, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TvCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {catalogGenre, catalogItem, catalogItemGenre, tvActor, tvDetails, tvNetwork, tvSeason,} from "@/lib/server/database/schema";


/** Persists canonical TMDB snapshots into the TV catalog tables. */
export class TvCatalogIngestionRepository {
    constructor(readonly kind: TvMediaType) {}

    async findByApiId(apiId: number | string) {
        return getDbClient()
            .select({
                id: catalogItem.id,
                apiId: catalogItem.primaryExternalId,
            })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, this.kind),
                eq(catalogItem.primaryProvider, "tmdb"),
                eq(catalogItem.primaryExternalId, String(apiId)),
            ))
            .get();
    }

    async findByApiIds(apiIds: (number | string)[]) {
        if (apiIds.length === 0) return [];

        return getDbClient()
            .select({
                id: catalogItem.id,
                apiId: catalogItem.primaryExternalId,
            })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, this.kind),
                eq(catalogItem.primaryProvider, "tmdb"),
                inArray(catalogItem.primaryExternalId, apiIds.map(String)),
            ));
    }

    async findByNames(names: string[]) {
        if (names.length === 0) return [];

        return getDbClient()
            .select({
                id: catalogItem.id,
                name: catalogItem.name,
                releaseDate: catalogItem.releaseDate,
            })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, this.kind),
                inArray(sql<string>`lower(trim(${catalogItem.name}))`, names),
            ));
    }

    getEpisodesPerSeason(catalogItemId: number) {
        return getDbClient()
            .select({
                season: tvSeason.seasonNumber,
                episodes: tvSeason.episodeCount,
            })
            .from(tvSeason)
            .where(eq(tvSeason.catalogItemId, catalogItemId))
            .orderBy(tvSeason.seasonNumber);
    }

    async insertSnapshot(details: TvCatalogSnapshot) {
        return this.persist(details, "store");
    }

    async replaceSnapshot(details: TvCatalogSnapshot) {
        const existing = await this.findByApiId(details.apiId);
        if (!existing) return false;

        await this.persist(details, "refresh");
        return true;
    }

    private async persist(details: TvCatalogSnapshot, mode: "store" | "refresh") {
        const apiId = String(details.apiId);
        const [item] = await getDbClient()
            .insert(catalogItem)
            .values({
                kind: this.kind,
                primaryProvider: "tmdb",
                primaryExternalId: apiId,
                name: details.name,
                synopsis: details.synopsis,
                lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
                releaseDate: details.releaseDate,
                locked: details.locked ?? false,
                imageCover: getImageFilename(details.imageCover),
            })
            .onConflictDoUpdate({
                target: [catalogItem.kind, catalogItem.primaryProvider, catalogItem.primaryExternalId],
                set: mode === "refresh"
                    ? {
                        name: details.name,
                        synopsis: details.synopsis,
                        lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
                        releaseDate: details.releaseDate,
                        imageCover: getImageFilename(details.imageCover),
                    }
                    : {
                        lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
                    },
            })
            .returning({ id: catalogItem.id });

        await getDbClient()
            .insert(tvDetails)
            .values({
                catalogItemId: item.id,
                homepage: details.homepage,
                createdBy: details.createdBy,
                voteCount: details.voteCount,
                popularity: details.popularity,
                lastAirDate: details.lastAirDate,
                voteAverage: details.voteAverage,
                originalName: details.originalName,
                totalSeasons: details.totalSeasons,
                totalEpisodes: details.totalEpisodes,
                originCountry: details.originCountry,
                productionStatus: details.productionStatus,
                nextEpisodeSeason: details.nextEpisodeSeason,
                nextEpisodeNumber: details.nextEpisodeNumber,
                episodeDurationMinutes: details.durationMinutes,
                nextEpisodeAirDate: details.nextEpisodeAirDate,
            })
            .onConflictDoUpdate({
                target: tvDetails.catalogItemId,
                set: {
                    homepage: details.homepage,
                    createdBy: details.createdBy,
                    voteCount: details.voteCount,
                    popularity: details.popularity,
                    voteAverage: details.voteAverage,
                    lastAirDate: details.lastAirDate,
                    originalName: details.originalName,
                    totalSeasons: details.totalSeasons,
                    totalEpisodes: details.totalEpisodes,
                    originCountry: details.originCountry,
                    productionStatus: details.productionStatus,
                    nextEpisodeSeason: details.nextEpisodeSeason,
                    nextEpisodeNumber: details.nextEpisodeNumber,
                    episodeDurationMinutes: details.durationMinutes,
                    nextEpisodeAirDate: details.nextEpisodeAirDate,
                },
            });

        await Promise.all([
            this.syncNamedRows(item.id, tvActor, details.actors, mode),
            this.syncNamedRows(item.id, tvNetwork, details.networks, mode),
            this.syncGenres(item.id, details.genres, mode),
            this.syncSeasons(item.id, details.seasons, mode),
        ]);

        return item.id;
    }

    private async syncNamedRows(catalogItemId: number, table: typeof tvActor | typeof tvNetwork, rows: string[] | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows);
        if (names.length === 0) return;

        if (mode === "refresh") {
            await getDbClient()
                .delete(table)
                .where(eq(table.catalogItemId, catalogItemId));
        }

        await getDbClient()
            .insert(table)
            .values(names.map((name) => ({ catalogItemId, name })))
            .onConflictDoNothing();
    }

    private async syncGenres(catalogItemId: number, rows: string[] | null | undefined, mode: "store" | "refresh") {
        const names = uniqueNames(rows ?? undefined);
        if (names.length === 0) return;

        await getDbClient()
            .insert(catalogGenre)
            .values(names.map((name) => ({ name })))
            .onConflictDoNothing();

        const genres = await getDbClient()
            .select()
            .from(catalogGenre)
            .where(inArray(catalogGenre.name, names));

        if (mode === "refresh") {
            await getDbClient()
                .delete(catalogItemGenre)
                .where(eq(catalogItemGenre.catalogItemId, catalogItemId));
        }

        await getDbClient()
            .insert(catalogItemGenre)
            .values(genres.map(genre => ({ catalogItemId, genreId: genre.id })))
            .onConflictDoNothing();
    }

    private async syncSeasons(catalogItemId: number, rows: { seasonNumber: number; episodeCount: number }[] | undefined, mode: "store" | "refresh") {
        if (!rows || rows.length === 0) return;
        const seasons = [...new Map(rows.map((row) => [row.seasonNumber, row])).values()];

        for (const season of seasons) {
            await getDbClient()
                .insert(tvSeason)
                .values({
                    catalogItemId,
                    seasonNumber: season.seasonNumber,
                    episodeCount: season.episodeCount,
                })
                .onConflictDoUpdate({
                    target: [tvSeason.catalogItemId, tvSeason.seasonNumber],
                    set: { episodeCount: season.episodeCount },
                });
        }

        if (mode === "refresh") {
            await getDbClient()
                .delete(tvSeason)
                .where(and(
                    eq(tvSeason.catalogItemId, catalogItemId),
                    notInArray(tvSeason.seasonNumber, seasons.map(({ seasonNumber }) => seasonNumber)),
                ));
        }
    }
}


const uniqueNames = (rows?: string[]) => {
    return [...new Set((rows ?? []).map((name) => name.trim()).filter(Boolean))];
}
