import {getImageFilename} from "@/lib/utils/image-url";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {and, eq, inArray, notInArray, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TvLibraryService} from "@/lib/server/domain/library/tv/tv-library.service";
import {MediaIngestionRepository} from "@/lib/server/api-providers/interfaces.types";
import {UpsertTvWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {TvLibraryRepository} from "@/lib/server/domain/library/tv/tv-library.repository";
import {catalogGenre, catalogItem, catalogItemGenre, tvActor, tvDetails, tvNetwork, tvSeason,} from "@/lib/server/database/schema";


/**
 * Adapter from the retained TMDB provider/transformer contract to the canonical TV catalog.
 */
export class TvCatalogIngestionRepository implements MediaIngestionRepository<UpsertTvWithDetails> {
    private readonly libraryService: TvLibraryService;
    private readonly libraryRepository: TvLibraryRepository;

    constructor(readonly kind: TvMediaType) {
        this.libraryRepository = new TvLibraryRepository();
        this.libraryService = new TvLibraryService(this.libraryRepository);
    }

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

    async storeMediaWithDetails(details: UpsertTvWithDetails) {
        return this.persist(details, "store");
    }

    async updateMediaWithDetails(details: UpsertTvWithDetails) {
        const existing = await this.findByApiId(details.mediaData.apiId);
        if (!existing) return false;

        await this.persist(details, "refresh");
        return true;
    }

    private async persist(details: UpsertTvWithDetails, mode: "store" | "refresh") {
        const apiId = String(details.mediaData.apiId);
        const existing = await this.findByApiId(apiId);

        const previousEntries = existing && mode === "refresh"
            ? await this.libraryRepository.findEntriesByCatalogItem(existing.id)
            : [];

        const [item] = await getDbClient()
            .insert(catalogItem)
            .values({
                kind: this.kind,
                primaryProvider: "tmdb",
                primaryExternalId: apiId,
                name: details.mediaData.name,
                synopsis: details.mediaData.synopsis,
                lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
                releaseDate: details.mediaData.releaseDate,
                locked: details.mediaData.lockStatus ?? false,
                imageCover: getImageFilename(details.mediaData.imageCover),
            })
            .onConflictDoUpdate({
                target: [catalogItem.kind, catalogItem.primaryProvider, catalogItem.primaryExternalId],
                set: mode === "refresh"
                    ? {
                        name: details.mediaData.name,
                        synopsis: details.mediaData.synopsis,
                        lastProviderUpdate: sql`CURRENT_TIMESTAMP`,
                        releaseDate: details.mediaData.releaseDate,
                        imageCover: getImageFilename(details.mediaData.imageCover),
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
                homepage: details.mediaData.homepage,
                createdBy: details.mediaData.createdBy,
                voteCount: details.mediaData.voteCount,
                popularity: details.mediaData.popularity,
                lastAirDate: details.mediaData.lastAirDate,
                voteAverage: details.mediaData.voteAverage,
                originalName: details.mediaData.originalName,
                totalSeasons: details.mediaData.totalSeasons,
                totalEpisodes: details.mediaData.totalEpisodes,
                originCountry: details.mediaData.originCountry,
                productionStatus: details.mediaData.prodStatus,
                nextEpisodeSeason: details.mediaData.seasonToAir,
                nextEpisodeNumber: details.mediaData.episodeToAir,
                episodeDurationMinutes: details.mediaData.duration,
                nextEpisodeAirDate: details.mediaData.nextEpisodeToAir,
            })
            .onConflictDoUpdate({
                target: tvDetails.catalogItemId,
                set: {
                    homepage: details.mediaData.homepage,
                    createdBy: details.mediaData.createdBy,
                    voteCount: details.mediaData.voteCount,
                    popularity: details.mediaData.popularity,
                    voteAverage: details.mediaData.voteAverage,
                    lastAirDate: details.mediaData.lastAirDate,
                    originalName: details.mediaData.originalName,
                    totalSeasons: details.mediaData.totalSeasons,
                    totalEpisodes: details.mediaData.totalEpisodes,
                    originCountry: details.mediaData.originCountry,
                    productionStatus: details.mediaData.prodStatus,
                    nextEpisodeSeason: details.mediaData.seasonToAir,
                    nextEpisodeNumber: details.mediaData.episodeToAir,
                    episodeDurationMinutes: details.mediaData.duration,
                    nextEpisodeAirDate: details.mediaData.nextEpisodeToAir,
                },
            });

        await Promise.all([
            this.syncNamedRows(item.id, tvActor, details.actorsData, mode),
            this.syncNamedRows(item.id, tvNetwork, details.networkData, mode),
            this.syncGenres(item.id, details.genresData, mode),
            this.syncSeasons(item.id, details.seasonsData, mode),
        ]);

        if (previousEntries.length > 0) {
            await this.libraryService.reconcileCatalogMetadata(previousEntries);
        }

        return item.id;
    }

    private async syncNamedRows(catalogItemId: number, table: typeof tvActor | typeof tvNetwork, rows: { name: string }[] | undefined, mode: "store" | "refresh") {
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

    private async syncGenres(catalogItemId: number, rows: { name: string }[] | null | undefined, mode: "store" | "refresh") {
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

    private async syncSeasons(catalogItemId: number, rows: { season: number; episodes: number }[] | undefined, mode: "store" | "refresh") {
        if (!rows || rows.length === 0) return;
        const seasons = [...new Map(rows.map((row) => [row.season, row])).values()];

        for (const season of seasons) {
            await getDbClient()
                .insert(tvSeason)
                .values({
                    catalogItemId,
                    seasonNumber: season.season,
                    episodeCount: season.episodes,
                })
                .onConflictDoUpdate({
                    target: [tvSeason.catalogItemId, tvSeason.seasonNumber],
                    set: { episodeCount: season.episodes },
                });
        }

        if (mode === "refresh") {
            await getDbClient()
                .delete(tvSeason)
                .where(and(
                    eq(tvSeason.catalogItemId, catalogItemId),
                    notInArray(tvSeason.seasonNumber, seasons.map(({ season }) => season)),
                ));
        }
    }
}


const uniqueNames = (rows?: { name: string }[]) => {
    return [...new Set((rows ?? []).map(({ name }) => name.trim()).filter(Boolean))];
}
