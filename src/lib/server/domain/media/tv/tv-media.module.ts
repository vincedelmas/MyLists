import {MediaType} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {JikanApi, TmdbApi} from "@/lib/server/api-providers/api";
import {TvDetailsQuery} from "@/lib/server/domain/media/tv/catalog/tv-details.query";
import {createTvMatcher} from "@/lib/server/domain/media/tv/imports/tv.matcher";
import {TvLibraryService} from "@/lib/server/domain/media/tv/library/tv-library.service";
import {TvLibraryRepository} from "@/lib/server/domain/media/tv/library/tv-library.repository";
import {TvCatalogEditCommand} from "@/lib/server/domain/media/tv/catalog/tv-catalog-edit.command";
import {TvCatalogReadRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-read.repository";
import {TvCatalogAdminRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-admin.repository";
import {TvCatalogIngestionCommand} from "@/lib/server/domain/media/tv/catalog/tv-catalog-ingestion.command";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-ingestion.repository";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/domain/media/tv/external/tmdb-tv.provider";
import {CatalogCoverStorage} from "@/lib/server/domain/media/shared/catalog/catalog-edit.shared";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {TvCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/tv/catalog/tv-catalog-refresh-candidates.query";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {animeMyListsCSVRowSchema, seriesMyListsCSVRowSchema} from "@/lib/server/domain/media/tv/imports/tv-import.schemas";
import {seriesAchievements} from "@/lib/server/domain/media/tv/achievements/series.seed";
import {animeAchievements} from "@/lib/server/domain/media/tv/achievements/anime.seed";
import {TvAchievementCalculator} from "@/lib/server/domain/media/tv/achievements/tv-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {TvWcfPoolSource} from "@/lib/server/domain/media/tv/features/which-came-first/tv-wcf-pool-source";
import type {WcfPoolSource} from "@/lib/server/domain/which-came-first/wcf.service";
import {TvUpcomingNotificationSource} from "@/lib/server/domain/media/tv/features/notifications/tv-upcoming-notification.source";
import type {UpcomingNotificationSource} from "@/lib/server/domain/notifications/notification.service";
import {tvActivityDefinition} from "@/lib/server/domain/media/tv/activity/tv-activity.definition";
import {TvActivityDurationSource} from "@/lib/server/domain/media/tv/activity/tv-activity-duration.source";
import type {ActivityDurationSource} from "@/lib/types/activity.types";


export const setupTvMediaModule = <K extends TvMediaType>(
    kind: K,
    clients: { tmdb: TmdbApi; jikan: JikanApi },
) => {
    const libraryRepository = new TvLibraryRepository(kind);
    const catalogAdmin = new TvCatalogAdminRepository(kind);
    const library = new TvLibraryService(kind, libraryRepository);
    const catalogRead = new TvCatalogReadRepository(kind);
    const catalogRepository = new TvCatalogIngestionRepository(kind);
    const catalogEdit = new TvCatalogEditCommand(
        catalogAdmin,
        library,
        new CatalogCoverStorage(kind),
    );
    const catalogCommands = new TvCatalogIngestionCommand(catalogRepository, library);
    const refreshIdentity = new CatalogRefreshIdentityQuery(kind);
    const refreshCandidates = new TvCatalogRefreshCandidatesQuery(kind);

    const external = (kind === MediaType.ANIME)
        ? createTmdbAnimeProvider(clients.tmdb)
        : createTmdbSeriesProvider(clients.tmdb);

    const refreshSource = {
        async getCandidateApiIds() {
            const changedIds = await external.changedIds?.getChangedIds() ?? [];
            return refreshCandidates.getCandidateApiIds(changedIds);
        },
    };

    const ingestion = (kind === MediaType.SERIES)
        ? createSeriesIngestionService(catalogCommands, external, refreshSource)
        : createAnimeIngestionService(clients.jikan, catalogCommands, external, refreshSource);

    return {
        kind,
        external,
        contributions: {
            imports: {
                matcher: createTvMatcher(kind, catalogRepository, external, ingestion, library),
                csv: {
                    rowSchema: kind === MediaType.SERIES ? seriesMyListsCSVRowSchema : animeMyListsCSVRowSchema,
                },
            },
            achievements: {
                definitions: kind === MediaType.SERIES ? seriesAchievements : animeAchievements,
                calculator: TvAchievementCalculator satisfies AchievementCalculator,
            },
            activity: {
                definition: tvActivityDefinition,
                durationSource: new TvActivityDurationSource(kind) satisfies ActivityDurationSource,
            },
            whichCameFirst: {
                pool: new TvWcfPoolSource(kind) satisfies WcfPoolSource,
            },
            notifications: {
                upcoming: new TvUpcomingNotificationSource(kind) satisfies UpcomingNotificationSource,
            },
        },
        catalog: {
            ingestion,
            edit: catalogEdit,
            admin: catalogAdmin,
            details: new TvDetailsQuery(kind, catalogRead, library),
            read: catalogRead,
            refresh: {
                identity: refreshIdentity,
                candidates: refreshCandidates,
                selfServiceAllowed: true,
            },
            maintenance: createCatalogMaintenance(kind),
        },
        library,
    } as const;
};
