import {ApiProviderType} from "@/lib/utils/enums";
import {UpsertMovieWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalTMDBMovieMatcher} from "@/lib/server/domain/imports/matchers/external-movie.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {MoviesImportListWriter} from "@/lib/server/domain/imports/list-writers/movies-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {MovieLibraryCommands} from "@/lib/server/domain/library/movies/movie-library.commands";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-ingestion.repository";


export const createMoviesMatcher = (
    catalog: MovieCatalogIngestionRepository,
    moviesProvider: ExternalMediaProvider<UpsertMovieWithDetails>,
    moviesIngestion: MediaIngestionService<UpsertMovieWithDetails>,
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
