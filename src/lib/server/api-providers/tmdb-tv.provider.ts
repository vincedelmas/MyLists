import {logger} from "@/lib/server/core/logger";
import {TvRepository} from "@/lib/server/domain/media/tv";
import {JikanApi, TmdbApi} from "@/lib/server/api-providers/api";
import {UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {moviesDefinition} from "@/lib/server/domain/media/movies/movies.definition";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {AnimeDefinition, animeDefinition} from "@/lib/server/domain/media/tv/anime/anime.definition";
import {ExternalMediaProvider, MediaDetailsEnricher} from "@/lib/server/api-providers/interfaces.types";
import {SeriesDefinition, seriesDefinition} from "@/lib/server/domain/media/tv/series/series.definition";
import {TmdbMediaIdentities, tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";


type TvDefinition = AnimeDefinition | SeriesDefinition;


const createAnimeGenresEnricher = (jikan: JikanApi, maxGenres: number): MediaDetailsEnricher<UpsertTvWithDetails> => {
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
                genresData: tmdbTransformer.addAnimeSpecificGenres(jikanData, details.genresData, maxGenres),
            };
        }
        catch (err) {
            logger.warn({ err, animeName: details.mediaData.name }, "Skipping Jikan anime genre enrichment");
            return details;
        }
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


const createTmdbTvProvider = (tmdb: TmdbApi, definition: TvDefinition): ExternalMediaProvider<UpsertTvWithDetails> => {
    const { identity, ingestion } = definition;

    const tmdbIdentities: TmdbMediaIdentities = {
        [moviesDefinition.identity.mediaType]: moviesDefinition.identity,
        [seriesDefinition.identity.mediaType]: seriesDefinition.identity,
        [animeDefinition.identity.mediaType]: animeDefinition.identity,
    };

    const transformOptions = {
        maxGenres: ingestion.limits.genres,
        maxActors: ingestion.limits.actors,
        maxWriters: ingestion.limits.writers,
        maxNetworks: ingestion.limits.networks,
        coverDirectory: identity.coverDirectory,
        defaultDuration: ingestion.defaultDuration,
    };

    return {
        mediaType: identity.mediaType,
        source: "tmdb",

        search: {
            async search(query, page = 1) {
                const raw = await tmdb.search(query, page);
                return tmdbTransformer.transformSearchResults(raw, tmdbIdentities);
            },
        },

        details: {
            async getDetails(apiId) {
                const raw = await tmdb.getTvDetails(Number(apiId));
                return tmdbTransformer.transformTvDetailsResults(raw, transformOptions);
            },
        },

        trends: {
            async getTrends() {
                const raw = await tmdb.getTvTrending();
                return tmdbTransformer.transformTvTrends(raw, tmdbIdentities);
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
    return createTmdbTvProvider(tmdb, seriesDefinition);
};


export const createTmdbAnimeProvider = (tmdb: TmdbApi): ExternalMediaProvider<UpsertTvWithDetails> => {
    return createTmdbTvProvider(tmdb, animeDefinition);
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
            createAnimeGenresEnricher(jikan, animeDefinition.ingestion.limits.genres),
        ],
    });
};
