import {ApiProviderType} from "@/lib/utils/enums";
import {MovieCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalTMDBMovieMatcher} from "@/lib/server/domain/media/movies/imports/external-movie.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {MoviesImportListWriter} from "@/lib/server/domain/media/movies/imports/movies-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {MovieLibraryCommands} from "@/lib/server/domain/media/movies/library/movie-library.commands";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.repository";


export const createMoviesMatcher = (
    catalog: MovieCatalogIngestionRepository,
    moviesProvider: ExternalMediaProvider<MovieCatalogSnapshot>,
    moviesIngestion: MediaIngestionService<MovieCatalogSnapshot>,
    libraryCommands: MovieLibraryCommands,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalTMDBMovieMatcher(moviesProvider, moviesIngestion),
    ],
    listWriter: new MoviesImportListWriter(libraryCommands),
});
