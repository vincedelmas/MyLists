import {ApiProviderType} from "@/lib/utils/enums";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import type {TmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {ExternalTMDBMovieMatcher} from "@/lib/server/domain/media/movies/external-movie.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {MoviesImportListWriter} from "@/lib/server/domain/media/movies/movies-import-list.writer";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";


export const createMoviesMatcher = (
    moviesService: MoviesService,
    moviesProvider: TmdbMoviesProvider,
    moviesIngestion: MediaIngestionService<UpsertMovieWithDetails>,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, moviesService),
        internalNameDateMatcher(moviesService, ApiProviderType.TMDB),
    ],
    externalMatchers: [
        new ExternalTMDBMovieMatcher(moviesProvider, moviesIngestion),
    ],
    listWriter: new MoviesImportListWriter(moviesService),
});
