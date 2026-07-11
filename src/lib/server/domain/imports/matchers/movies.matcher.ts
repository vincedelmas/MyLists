import {ApiProviderType} from "@/lib/utils/enums";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalTMDBMovieMatcher} from "@/lib/server/domain/imports/matchers/external-movie.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {MoviesImportListWriter} from "@/lib/server/domain/imports/list-writers/movies-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";


export const createMoviesMatcher = (
    moviesService: MoviesService,
    moviesProvider: ExternalMediaProvider<UpsertMovieWithDetails>,
    moviesIngestion: MediaIngestionService<UpsertMovieWithDetails>,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, moviesService),
        internalNameDateMatcher(moviesService),
    ],
    externalMatchers: [
        new ExternalTMDBMovieMatcher(moviesProvider, moviesIngestion),
    ],
    listWriter: new MoviesImportListWriter(moviesService),
});
