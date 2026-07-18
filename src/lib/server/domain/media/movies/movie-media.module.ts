import {MediaType} from "@/lib/utils/enums";
import {TmdbApi} from "@/lib/server/api-providers/api";
import type {UpComingMedia} from "@/lib/types/notifications.types";
import type {ActivityDurationSource} from "@/lib/types/activity.types";
import type {WcfPoolSource} from "@/lib/server/domain/which-came-first/wcf.service";
import type {MediadleEligibility} from "@/lib/server/domain/mediadle/mediadle.service";
import {createMoviesMatcher} from "@/lib/server/domain/media/movies/imports/movies.matcher";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements/movies.seed";
import {MovieDetailsQuery} from "@/lib/server/domain/media/movies/catalog/movie-details.query";
import {MovieLibraryCommands} from "@/lib/server/domain/media/movies/library/movie-library.commands";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import type {UpcomingNotificationSource} from "@/lib/server/domain/notifications/notification.service";
import {moviesMyListsCSVRowSchema} from "@/lib/server/domain/media/movies/imports/movie-import.schemas";
import {MovieLibraryRepository} from "@/lib/server/domain/media/movies/library/movie-library.repository";
import {movieActivityDefinition} from "@/lib/server/domain/media/movies/activity/movie-activity.definition";
import {MovieCatalogEditCommand} from "@/lib/server/domain/media/movies/catalog/movie-catalog-edit.command";
import {MovieListReadRepository} from "@/lib/server/domain/media/movies/library/movie-list-read.repository";
import {MovieStatsRepository} from "@/lib/server/domain/media/movies/library/movie-stats.repository";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {MovieLibraryReadRepository} from "@/lib/server/domain/media/movies/library/movie-library-read.repository";
import {MovieCatalogReadRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-read.repository";
import {exportMovieLibraryCsv} from "@/lib/server/domain/media/movies/library/movie-library-csv-export";
import {MovieWcfPoolSource} from "@/lib/server/domain/media/movies/features/which-came-first/movie-wcf-pool-source";
import {MovieCatalogAdminRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-admin.repository";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {MovieActivityDurationSource} from "@/lib/server/domain/media/movies/activity/movie-activity-duration.source";
import {MovieAchievementCalculator} from "@/lib/server/domain/media/movies/achievements/movie-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {MovieCatalogIngestionCommand} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.command";
import {MovieMediadleEligibility} from "@/lib/server/domain/media/movies/features/mediadle/movie-mediadle.eligibility";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/media/movies/catalog/movie-catalog-ingestion.repository";
import {MovieCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/movies/catalog/movie-catalog-refresh-candidates.query";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/domain/media/movies/external/tmdb-movies.provider";
import {MovieUpcomingNotificationSource} from "@/lib/server/domain/media/movies/features/notifications/movie-upcoming-notification.source";


export const setupMovieMediaModule = (tmdb: TmdbApi) => {
    const list = new MovieListReadRepository();
    const tags = new LibraryTagsQuery(MediaType.MOVIES);
    const catalogRead = new MovieCatalogReadRepository();
    const catalogAdmin = new MovieCatalogAdminRepository();
    const libraryRepository = new MovieLibraryRepository();
    const catalogRepository = new MovieCatalogIngestionRepository();
    const refreshCandidates = new MovieCatalogRefreshCandidatesQuery();
    const libraryCommands = new MovieLibraryCommands(libraryRepository);
    const libraryRead = new MovieLibraryReadRepository(libraryRepository);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.MOVIES);
    const catalogEdit = new MovieCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands);
    const catalogCommands = new MovieCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);

    const external = createTmdbMoviesProvider(tmdb);
    const ingestion = createMoviesIngestionService(catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.MOVIES,
        external,
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
            stats: MovieStatsRepository,
            read: libraryRead,
            export: {
                csv: exportMovieLibraryCsv,
            },
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Parameters<MovieLibraryCommands["editTag"]>[0]) => libraryCommands.editTag(params),
            },
            covers: new LibraryCustomCoverCommand(MediaType.MOVIES, libraryRead, libraryCommands),
            async upcoming(ownerId: number): Promise<UpComingMedia[]> {
                return list.getUpcomingMedia({ ownerId, actorId: ownerId, reason: "owner", mediaTypeEnabled: true });
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
            notifications: {
                upcoming: MovieUpcomingNotificationSource satisfies UpcomingNotificationSource,
            },
        },
    } as const;
};
