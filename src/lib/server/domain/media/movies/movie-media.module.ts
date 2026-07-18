import {MediaType} from "@/lib/utils/enums";
import {TmdbApi} from "@/lib/server/api-providers/api";
import {UpComingMedia} from "@/lib/types/notifications.types";
import type {MediadleEligibility} from "@/lib/server/domain/mediadle/mediadle.service";
import {createMoviesMatcher} from "@/lib/server/domain/media/movies/imports/movies.matcher";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements/movies.seed";
import {MovieDetailsQuery} from "@/lib/server/domain/media/movies/catalog/movie-details.query";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {MovieLibraryCommands} from "@/lib/server/domain/media/movies/library/movie-library.commands";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {moviesMyListsCSVRowSchema} from "@/lib/server/domain/media/movies/imports/movie-import.schemas";
import {MovieLibraryRepository} from "@/lib/server/domain/media/movies/library/movie-library.repository";
import {createLibraryStatsRebuild} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {MovieWcfPoolSource} from "@/lib/server/domain/media/movies/features/which-came-first/movie-wcf-pool-source";
import type {WcfPoolSource} from "@/lib/server/domain/which-came-first/wcf.service";
import {movieActivityDefinition} from "@/lib/server/domain/media/movies/activity/movie-activity.definition";
import {MovieCatalogEditCommand} from "@/lib/server/domain/media/movies/catalog/movie-catalog-edit.command";
import {MovieListReadRepository} from "@/lib/server/domain/media/movies/library/movie-list-read.repository";
import {getMovieStatsContributions} from "@/lib/server/domain/media/movies/library/movie-stats-contributions";
import {MovieStatsReadRepository} from "@/lib/server/domain/media/movies/library/movie-stats-read.repository";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {MovieMediadleEligibility} from "@/lib/server/domain/media/movies/features/mediadle/movie-mediadle.eligibility";
import {MovieLibraryReadRepository} from "@/lib/server/domain/media/movies/library/movie-library-read.repository";
import {MovieCatalogReadRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-read.repository";
import {MovieActivityDurationSource} from "@/lib/server/domain/media/movies/activity/movie-activity-duration.source";
import type {ActivityDurationSource} from "@/lib/types/activity.types";
import {MovieLibraryCsvExportQuery} from "@/lib/server/domain/media/movies/library/movie-library-csv-export.query";
import {MovieCatalogAdminRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-admin.repository";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {MovieAchievementCalculator} from "@/lib/server/domain/media/movies/achievements/movie-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {MovieCatalogIngestionCommand} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.command";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.repository";
import {MovieCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/movies/catalog/movie-catalog-refresh-candidates.query";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/domain/media/movies/external/tmdb-movies.provider";
import {MovieUpcomingNotificationCommand} from "@/lib/server/domain/media/movies/features/notifications/movie-upcoming-notification.command";


export const setupMovieMediaModule = (tmdb: TmdbApi) => {
    const list = new MovieListReadRepository();
    const statsRead = new MovieStatsReadRepository();
    const csvExport = new MovieLibraryCsvExportQuery();
    const tags = new LibraryTagsQuery(MediaType.MOVIES);
    const catalogRead = new MovieCatalogReadRepository();
    const catalogAdmin = new MovieCatalogAdminRepository();
    const libraryRepository = new MovieLibraryRepository();
    const catalogRepository = new MovieCatalogIngestionRepository();
    const refreshCandidates = new MovieCatalogRefreshCandidatesQuery();
    const libraryCommands = new MovieLibraryCommands(libraryRepository);
    const libraryRead = new MovieLibraryReadRepository(libraryRepository);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.MOVIES);
    const upcomingNotifications = new MovieUpcomingNotificationCommand(list, NotificationsRepository);
    const catalogEdit = new MovieCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands);
    const catalogCommands = new MovieCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);

    const external = createTmdbMoviesProvider(tmdb);
    const ingestion = createMoviesIngestionService(catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.MOVIES,
        external,
        notifications: {
            upcoming: upcomingNotifications,
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
                rebuild: createLibraryStatsRebuild({ kind: MediaType.MOVIES, getContributions: getMovieStatsContributions }),
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
        contributions: {
            imports: {
                matcher: createMoviesMatcher(catalogRepository, external, ingestion, libraryCommands),
                csv: {
                    rowSchema: moviesMyListsCSVRowSchema,
                },
            },
            achievements: {
                definitions: moviesAchievements,
                calculator: MovieAchievementCalculator satisfies AchievementCalculator,
            },
            activity: {
                definition: movieActivityDefinition,
                durationSource: MovieActivityDurationSource satisfies ActivityDurationSource,
            },
            whichCameFirst: {
                pool: MovieWcfPoolSource satisfies WcfPoolSource,
            },
            mediadle: {
                eligibility: MovieMediadleEligibility satisfies MediadleEligibility,
            },
        },
    } as const;
};
