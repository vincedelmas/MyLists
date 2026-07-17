import {MediaType} from "@/lib/utils/enums";
import {logger} from "@/lib/server/core/logger";
import {JikanApi, TmdbApi} from "@/lib/server/api-providers/api";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {CatalogIngestionCommands} from "@/lib/server/domain/media/shared/catalog/catalog-ingestion.types";
import {TvCatalogSnapshot} from "@/lib/server/domain/media/tv/catalog/tv-catalog-snapshot";
import {tmdbTvTransformer} from "@/lib/server/domain/media/tv/external/tmdb-tv.transformer";
import {transformTmdbSearchResults} from "@/lib/server/domain/media/shared/external/tmdb-search.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider, MediaDetailsEnricher, RefreshCandidateSource} from "@/lib/server/api-providers/interfaces.types";


const createAnimeGenresEnricher = (jikan: JikanApi): MediaDetailsEnricher<TvCatalogSnapshot> => {
    return async (details, context) => {
        // If isBulk is true, we don't query Jikan for the genres, so we don't want to override the genres
        if (context.isBulk) {
            const enriched = { ...details };
            delete enriched.genres; // Bulk refresh keeps the existing Jikan-enriched genres.
            return enriched;
        }

        try {
            const jikanData = await jikan.getAnimeGenresAndDemographics(details.name);

            return {
                ...details,
                genres: tmdbTvTransformer.addAnimeSpecificGenres(jikanData, details.genres),
            };
        }
        catch (err) {
            logger.warn({ err, animeName: details.name }, "Skipping Jikan anime genre enrichment");
            return details;
        }
    };
};


const createTmdbTvProvider = (tmdb: TmdbApi, mediaType: TvMediaType, transformDetails: typeof tmdbTvTransformer.transformSeriesDetails): ExternalMediaProvider<TvCatalogSnapshot> => {
    return {
        mediaType,
        source: "tmdb",

        search: {
            async search(query, page = 1) {
                const raw = await tmdb.search(query, page);
                return transformTmdbSearchResults(raw);
            },
        },

        details: {
            async getDetails(apiId) {
                const raw = await tmdb.getTvDetails(Number(apiId));
                return transformDetails(raw);
            },
        },

        trends: {
            async getTrends() {
                const raw = await tmdb.getTvTrending();
                return tmdbTvTransformer.transformTrends(raw);
            },
        },

        changedIds: {
            getChangedIds() {
                return tmdb.getTvChangedIds();
            },
        },
    };
};


export const createTmdbSeriesProvider = (tmdb: TmdbApi): ExternalMediaProvider<TvCatalogSnapshot> => {
    return createTmdbTvProvider(tmdb, MediaType.SERIES, tmdbTvTransformer.transformSeriesDetails);
};


export const createTmdbAnimeProvider = (tmdb: TmdbApi): ExternalMediaProvider<TvCatalogSnapshot> => {
    return createTmdbTvProvider(tmdb, MediaType.ANIME, tmdbTvTransformer.transformAnimeDetails);
};


export const createSeriesIngestionService = (
    catalog: CatalogIngestionCommands<TvCatalogSnapshot>,
    provider: ExternalMediaProvider<TvCatalogSnapshot>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        catalog,
        refreshCandidates,
    });
};


export const createAnimeIngestionService = (
    jikan: JikanApi,
    catalog: CatalogIngestionCommands<TvCatalogSnapshot>,
    provider: ExternalMediaProvider<TvCatalogSnapshot>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        catalog,
        refreshCandidates,
        enrichers: [
            createAnimeGenresEnricher(jikan),
        ],
    });
};
