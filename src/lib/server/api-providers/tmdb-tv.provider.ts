import {MediaType} from "@/lib/utils/enums";
import {logger} from "@/lib/server/core/logger";
import {JikanApi, TmdbApi} from "@/lib/server/api-providers/api";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {UpsertTvWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider, MediaDetailsEnricher, MediaIngestionRepository, RefreshCandidateSource} from "@/lib/server/api-providers/interfaces.types";


const createAnimeGenresEnricher = (jikan: JikanApi): MediaDetailsEnricher<UpsertTvWithDetails> => {
    return async (details, context) => {
        // If isBulk is true, we don't query Jikan for the genres, so we don't want to override the genres
        if (context.isBulk) {
            const enriched = { ...details };
            delete enriched.genresData; // genresData are the genres from TMDB, we want to keep the one from Jikan
            return enriched;
        }

        try {
            const jikanData = await jikan.getAnimeGenresAndDemographics(details.mediaData.name);

            return {
                ...details,
                genresData: tmdbTransformer.addAnimeSpecificGenres(jikanData, details.genresData),
            };
        }
        catch (err) {
            logger.warn({ err, animeName: details.mediaData.name }, "Skipping Jikan anime genre enrichment");
            return details;
        }
    };
};


const createTmdbTvProvider = (tmdb: TmdbApi, mediaType: TvMediaType, transformDetails: typeof tmdbTransformer.transformSeriesDetailsResults): ExternalMediaProvider<UpsertTvWithDetails> => {
    return {
        mediaType,
        source: "tmdb",

        search: {
            async search(query, page = 1) {
                const raw = await tmdb.search(query, page);
                return tmdbTransformer.transformSearchResults(raw);
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
                return tmdbTransformer.transformTvTrends(raw);
            },
        },

        changedIds: {
            getChangedIds() {
                return tmdb.getTvChangedIds();
            },
        },
    };
};


export const createTmdbSeriesProvider = (tmdb: TmdbApi): ExternalMediaProvider<UpsertTvWithDetails> => {
    return createTmdbTvProvider(tmdb, MediaType.SERIES, tmdbTransformer.transformSeriesDetailsResults);
};


export const createTmdbAnimeProvider = (tmdb: TmdbApi): ExternalMediaProvider<UpsertTvWithDetails> => {
    return createTmdbTvProvider(tmdb, MediaType.ANIME, tmdbTransformer.transformAnimeDetailsResults);
};


export const createSeriesIngestionService = (
    repository: MediaIngestionRepository<UpsertTvWithDetails>,
    provider: ExternalMediaProvider<UpsertTvWithDetails>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates,
    });
};


export const createAnimeIngestionService = (
    jikan: JikanApi,
    repository: MediaIngestionRepository<UpsertTvWithDetails>,
    provider: ExternalMediaProvider<UpsertTvWithDetails>,
    refreshCandidates?: RefreshCandidateSource,
) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates,
        enrichers: [
            createAnimeGenresEnricher(jikan),
        ],
    });
};
