import {MediaType} from "@/lib/utils/enums";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {createMoviesMatcher} from "@/lib/server/domain/imports/matchers/movies.matcher";
import {MovieDetailsQuery} from "@/lib/server/domain/catalog/movies/movie-details.query";
import {MovieLibraryCommands} from "@/lib/server/domain/library/movies/movie-library.commands";
import {MovieLibraryRepository} from "@/lib/server/domain/library/movies/movie-library.repository";
import {MovieCatalogEditCommand} from "@/lib/server/domain/catalog/movies/movie-catalog-edit.command";
import {MovieListReadRepository} from "@/lib/server/domain/library/movies/movie-list-read.repository";
import {MovieStatsReadRepository} from "@/lib/server/domain/library/movies/movie-stats-read.repository";
import {MovieLibraryReadRepository} from "@/lib/server/domain/library/movies/movie-library-read.repository";
import {MovieCatalogReadRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-read.repository";
import {MovieCatalogAdminRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-admin.repository";
import {MovieCatalogIngestionCommand} from "@/lib/server/domain/catalog/movies/movie-catalog-ingestion.command";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-ingestion.repository";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";


export const setupMovieMediaModule = (apiClients: ApiClientModule, refreshCandidates: CatalogRefreshCandidateRepository) => {
    const list = new MovieListReadRepository();
    const catalogAdmin = new MovieCatalogAdminRepository();
    const libraryRepository = new MovieLibraryRepository();
    const catalogRepository = new MovieCatalogIngestionRepository();
    const libraryCommands = new MovieLibraryCommands(libraryRepository);
    const catalogEdit = new MovieCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands);
    const catalogCommands = new MovieCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);

    const external = createTmdbMoviesProvider(apiClients.tmdb);
    const ingestion = createMoviesIngestionService(catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getMovieCandidateApiIds(),
    });

    return {
        kind: MediaType.MOVIES,
        external,
        imports: {
            matcher: createMoviesMatcher(catalogRepository, external, ingestion, libraryCommands),
        },
        catalog: {
            ingestion,
            edit: catalogEdit,
            admin: catalogAdmin,
            details: new MovieDetailsQuery(),
            read: new MovieCatalogReadRepository(),
            refreshIdentity: {
                get: (catalogItemId: number) => {
                    return refreshCandidates.getItemIdentity(MediaType.MOVIES, catalogItemId);
                },
            },
        },
        library: {
            list,
            commands: libraryCommands,
            stats: new MovieStatsReadRepository(),
            read: new MovieLibraryReadRepository(),
            upcoming: {
                async forOwner(ownerId: number): Promise<UpComingMedia[]> {
                    return list.getUpcomingMedia({ ownerId, actorId: ownerId, reason: "owner", mediaTypeEnabled: true });
                },
                async forNotifications(): Promise<UpComingMedia[]> {
                    return list.getUpcomingMediaForNotifications();
                },
            },
        },
    } as const;
};
