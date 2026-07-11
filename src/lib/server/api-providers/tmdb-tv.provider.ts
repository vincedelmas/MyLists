import {MediaType} from "@/lib/utils/enums";
import {TvRepository} from "@/lib/server/domain/media/tv";
import {JikanApi, TmdbApi} from "@/lib/server/api-providers/api";
import {TvMediaType, UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider, MediaDetailsEnricher} from "@/lib/server/api-providers/interfaces.types";


const createAnimeGenresEnricher = (jikan: JikanApi): MediaDetailsEnricher<UpsertTvWithDetails> => {
    return async (details, context) => {
        if (context.isBulk) {
            const enriched = { ...details };
            delete enriched.genresData;
            return enriched;
        }

        const jikanData = await jikan.getAnimeGenresAndDemographics(details.mediaData.name);

        return {
            ...details,
            genresData: tmdbTransformer.addAnimeSpecificGenres(jikanData, details.genresData),
        };
    };
};


const createTvRefreshCandidates = (repository: TvRepository, provider: ExternalMediaProvider<UpsertTvWithDetails>) => {
    return {
        async getCandidateApiIds() {
            const changedIds = await provider.changedIds?.getChangedIds() ?? [];
            return repository.getMediaIdsToBeRefreshed(changedIds.map(Number));
        },
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


export const createSeriesIngestionService = (repository: TvRepository, provider: ExternalMediaProvider<UpsertTvWithDetails>) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates: createTvRefreshCandidates(repository, provider),
    });
};


export const createAnimeIngestionService = (jikan: JikanApi, repository: TvRepository, provider: ExternalMediaProvider<UpsertTvWithDetails>) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates: createTvRefreshCandidates(repository, provider),
        enrichers: [
            createAnimeGenresEnricher(jikan),
        ],
    });
};
