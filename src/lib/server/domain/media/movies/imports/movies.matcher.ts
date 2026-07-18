import {ApiProviderType} from "@/lib/utils/enums";
import {MovieCatalogSnapshot} from "@/lib/server/domain/media/movies/catalog/movie-catalog-snapshot";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalTMDBMovieMatcher} from "@/lib/server/domain/media/movies/imports/external-movie.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {MoviesImportListWriter} from "@/lib/server/domain/media/movies/imports/movies-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {MovieLibraryService} from "@/lib/server/domain/media/movies/library/movie-library.service";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.repository";


export const createMoviesMatcher = (
    catalog: MovieCatalogIngestionRepository,
    moviesProvider: ExternalMediaProvider<MovieCatalogSnapshot>,
    moviesIngestion: MediaIngestionService<MovieCatalogSnapshot>,
    library: MovieLibraryService,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalTMDBMovieMatcher(moviesProvider, moviesIngestion),
    ],
    listWriter: new MoviesImportListWriter(library),
});
