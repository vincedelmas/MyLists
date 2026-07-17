import {MediaType} from "@/lib/utils/enums";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {TmdbApi} from "@/lib/server/api-providers/api";
import {createMoviesMatcher} from "@/lib/server/domain/media/movies/imports/movies.matcher";
import {MovieDetailsQuery} from "@/lib/server/domain/media/movies/catalog/movie-details.query";
import {MovieLibraryCommands} from "@/lib/server/domain/media/movies/library/movie-library.commands";
import {MovieLibraryRepository} from "@/lib/server/domain/media/movies/library/movie-library.repository";
import {MovieCatalogEditCommand} from "@/lib/server/domain/media/movies/catalog/movie-catalog-edit.command";
import {MovieListReadRepository} from "@/lib/server/domain/media/movies/library/movie-list-read.repository";
import {MovieStatsReadRepository} from "@/lib/server/domain/media/movies/library/movie-stats-read.repository";
import {MovieLibraryReadRepository} from "@/lib/server/domain/media/movies/library/movie-library-read.repository";
import {MovieCatalogReadRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-read.repository";
import {MovieCatalogAdminRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-admin.repository";
import {MovieCatalogIngestionCommand} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.command";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.repository";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/domain/media/movies/external/tmdb-movies.provider";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {MovieCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/movies/catalog/movie-catalog-refresh-candidates.query";
import {MovieLibraryCsvExportQuery} from "@/lib/server/domain/media/movies/library/movie-library-csv-export.query";
import {MovieStatsContributionQuery} from "@/lib/server/domain/media/movies/library/movie-stats-contribution.query";
import {LibraryStatsRebuildCommand} from "@/lib/server/domain/media/shared/library/library-stats-rebuild.command";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {moviesMyListsCSVRowSchema} from "@/lib/server/domain/media/movies/imports/movie-import.schemas";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements/movies.seed";
import {MovieAchievementCalculator} from "@/lib/server/domain/media/movies/achievements/movie-achievement-calculator";
import {MovieWcfQuery} from "@/lib/server/domain/media/movies/features/which-came-first/movie-wcf.query";
import {MovieMediadleCatalogQuery} from "@/lib/server/domain/media/movies/features/mediadle/movie-mediadle.query";
import {MovieUpcomingNotificationCommand} from "@/lib/server/domain/media/movies/features/notifications/movie-upcoming-notification.command";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {movieActivityDefinition} from "@/lib/server/domain/media/movies/activity/movie-activity.definition";
import {CatalogActivityQuery} from "@/lib/server/domain/media/shared/activity/catalog-activity.query";
import {MovieActivityDurationQuery} from "@/lib/server/domain/media/movies/activity/movie-activity-duration.query";


export const setupMovieMediaModule = (tmdb: TmdbApi) => {
    const list = new MovieListReadRepository();
    const catalogAdmin = new MovieCatalogAdminRepository();
    const libraryRepository = new MovieLibraryRepository();
    const catalogRepository = new MovieCatalogIngestionRepository();
    const libraryCommands = new MovieLibraryCommands(libraryRepository);
    const libraryRead = new MovieLibraryReadRepository(libraryRepository);
    const catalogRead = new MovieCatalogReadRepository();
    const catalogEdit = new MovieCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands);
    const catalogCommands = new MovieCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.MOVIES);
    const refreshCandidates = new MovieCatalogRefreshCandidatesQuery();
    const statsRead = new MovieStatsReadRepository();
    const statsRebuild = new LibraryStatsRebuildCommand(MediaType.MOVIES, new MovieStatsContributionQuery());
    const csvExport = new MovieLibraryCsvExportQuery();
    const tags = new LibraryTagsQuery(MediaType.MOVIES);
    const upcomingNotifications = new MovieUpcomingNotificationCommand(list, NotificationsRepository);

    const external = createTmdbMoviesProvider(tmdb);
    const ingestion = createMoviesIngestionService(catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.MOVIES,
        external,
        imports: {
            matcher: createMoviesMatcher(catalogRepository, external, ingestion, libraryCommands),
            csv: {
                rowSchema: moviesMyListsCSVRowSchema,
            },
        },
        achievements: {
            definitions: moviesAchievements,
            calculator: new MovieAchievementCalculator(),
        },
        features: {
            whichCameFirst: new MovieWcfQuery(),
            mediadle: new MovieMediadleCatalogQuery(),
        },
        notifications: {
            upcoming: upcomingNotifications,
        },
        activity: {
            definition: movieActivityDefinition,
            catalog: new CatalogActivityQuery(MediaType.MOVIES, new MovieActivityDurationQuery()),
        },
        catalog: {
            ingestion,
            edit: catalogEdit,
            admin: catalogAdmin,
            details: new MovieDetailsQuery(catalogRead, libraryRead),
            read: catalogRead,
            refresh: {
                identity: refreshIdentity,
                candidates: refreshCandidates,
                selfServiceAllowed: true,
            },
            maintenance: createCatalogMaintenance(MediaType.MOVIES),
        },
        library: {
            list,
            commands: libraryCommands,
            read: libraryRead,
            export: {
                csv: (userId: number) => csvExport.export(userId),
            },
            stats: {
                read: statsRead,
                rebuild: () => statsRebuild.rebuild(),
            },
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Parameters<MovieLibraryCommands["editTag"]>[0]) => libraryCommands.editTag(params),
            },
            covers: new LibraryCustomCoverCommand(MediaType.MOVIES, libraryRead, libraryCommands),
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
