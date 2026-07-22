import {TmdbApi} from "@/lib/server/api-providers/api";
import {MoviesRepository} from "@/lib/server/domain/media/movies";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {moviesDefinition} from "@/lib/server/domain/media/movies/movies.definition";
import {animeDefinition} from "@/lib/server/domain/media/tv/anime/anime.definition";
import {UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {seriesDefinition} from "@/lib/server/domain/media/tv/series/series.definition";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {TmdbMediaIdentities, tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";


export const createTmdbMoviesProvider = (tmdb: TmdbApi): ExternalMediaProvider<UpsertMovieWithDetails> => {
    const { identity, ingestion } = moviesDefinition;

    const tmdbIdentities: TmdbMediaIdentities = {
        [moviesDefinition.identity.mediaType]: moviesDefinition.identity,
        [seriesDefinition.identity.mediaType]: seriesDefinition.identity,
        [animeDefinition.identity.mediaType]: animeDefinition.identity,
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
        repository: repository,
        refreshCandidates: {
            getCandidateApiIds: () => {
                return repository.getMediaIdsToBeRefreshed();
            },
        },
    });
}
