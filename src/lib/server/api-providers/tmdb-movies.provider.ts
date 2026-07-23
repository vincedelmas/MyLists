import {TmdbApi} from "@/lib/server/api-providers/api";
import {MoviesRepository} from "@/lib/server/domain/media/movies";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {TmdbMediaIdentities, tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";


export const createTmdbMoviesProvider = (tmdb: TmdbApi): ExternalMediaProvider<UpsertMovieWithDetails> => {
    const { identity, ingestion } = moviesServerDefinition;

    const tmdbIdentities: TmdbMediaIdentities = {
        [moviesServerDefinition.identity.mediaType]: moviesServerDefinition.identity,
        [seriesServerDefinition.identity.mediaType]: seriesServerDefinition.identity,
        [animeServerDefinition.identity.mediaType]: animeServerDefinition.identity,
    };

    const transformOptions = {
        maxGenres: ingestion.limits.genres,
        maxActors: ingestion.limits.actors,
        coverDirectory: identity.coverDirectory,
        defaultDuration: ingestion.defaultDuration,
    };

    return ({
        source: "tmdb",
        mediaType: identity.mediaType,

        search: {
            async search(query, page = 1) {
                const raw = await tmdb.search(query, page);
                return tmdbTransformer.transformSearchResults(raw, tmdbIdentities);
            },
        },
        details: {
            async getDetails(apiId) {
                const raw = await tmdb.getMovieDetails(Number(apiId));
                return tmdbTransformer.transformMoviesDetailsResults(raw, transformOptions);
            },
        },
        trends: {
            async getTrends() {
                const raw = await tmdb.getMoviesTrending();
                return tmdbTransformer.transformMoviesTrends(raw, identity);
            },
        },
    });
}


export const createMoviesIngestionService = (repository: MoviesRepository, provider: ExternalMediaProvider<UpsertMovieWithDetails>) => {
    return createMediaIngestionService({
        provider,
        repository,
        refreshCandidates: {
            getCandidateApiIds: () => {
                return repository.getMediaIdsToBeRefreshed();
            },
        },
    });
}
