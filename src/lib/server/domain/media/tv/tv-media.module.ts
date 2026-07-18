import {MediaType} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import type {UpComingMedia} from "@/lib/types/notifications.types";
import {JikanApi, TmdbApi} from "@/lib/server/api-providers/api";
import {TvDetailsQuery} from "@/lib/server/domain/media/tv/catalog/tv-details.query";
import {createTvMatcher} from "@/lib/server/domain/media/tv/imports/tv.matcher";
import {TvLibraryCommands} from "@/lib/server/domain/media/tv/library/tv-library.commands";
import {TvLibraryRepository} from "@/lib/server/domain/media/tv/library/tv-library.repository";
import {TvCatalogEditCommand} from "@/lib/server/domain/media/tv/catalog/tv-catalog-edit.command";
import {TvListReadRepository} from "@/lib/server/domain/media/tv/library/tv-list-read.repository";
import {TvStatsReadRepository} from "@/lib/server/domain/media/tv/library/tv-stats-read.repository";
import {TvLibraryReadRepository} from "@/lib/server/domain/media/tv/library/tv-library-read.repository";
import {TvCatalogReadRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-read.repository";
import {TvCatalogAdminRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-admin.repository";
import {TvCatalogIngestionCommand} from "@/lib/server/domain/media/tv/catalog/tv-catalog-ingestion.command";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-ingestion.repository";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/domain/media/tv/external/tmdb-tv.provider";
import {CatalogCoverStorage} from "@/lib/server/domain/media/shared/catalog/catalog-edit.shared";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {TvCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/tv/catalog/tv-catalog-refresh-candidates.query";
import {TvLibraryCsvExportQuery} from "@/lib/server/domain/media/tv/library/tv-library-csv-export.query";
import {getTvStatsContributions} from "@/lib/server/domain/media/tv/library/tv-stats-contributions";
import {createLibraryStatsRebuild} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
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
    const list = new TvListReadRepository(kind);
    const libraryRepository = new TvLibraryRepository();
    const catalogAdmin = new TvCatalogAdminRepository(kind);
    const libraryCommands = new TvLibraryCommands(libraryRepository);
    const libraryRead = new TvLibraryReadRepository(kind, libraryRepository);
    const catalogRead = new TvCatalogReadRepository(kind);
    const catalogRepository = new TvCatalogIngestionRepository(kind);
    const catalogEdit = new TvCatalogEditCommand(
        catalogAdmin,
        libraryRepository,
        libraryCommands,
        new CatalogCoverStorage(kind),
    );
    const catalogCommands = new TvCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);
    const refreshIdentity = new CatalogRefreshIdentityQuery(kind);
    const refreshCandidates = new TvCatalogRefreshCandidatesQuery(kind);
    const statsRead = new TvStatsReadRepository(kind);
    const csvExport = new TvLibraryCsvExportQuery(kind);
    const tags = new LibraryTagsQuery(kind);

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
                matcher: createTvMatcher(kind, catalogRepository, external, ingestion, libraryCommands),
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
            details: new TvDetailsQuery(kind, catalogRead, libraryRead),
            read: catalogRead,
            refresh: {
                identity: refreshIdentity,
                candidates: refreshCandidates,
                selfServiceAllowed: true,
            },
            maintenance: createCatalogMaintenance(kind),
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
                rebuild: createLibraryStatsRebuild({
                    kind,
                    getContributions: () => getTvStatsContributions(kind),
                }),
            },
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Omit<Parameters<TvLibraryCommands["editTag"]>[0], "kind">) => {
                    return libraryCommands.editTag({ ...params, kind });
                },
            },
            covers: new LibraryCustomCoverCommand(kind, libraryRead, libraryCommands),
            async upcoming(ownerId: number): Promise<UpComingMedia[]> {
                return list.getUpcomingMedia({ ownerId, actorId: ownerId, reason: "owner", mediaTypeEnabled: true });
            },
        },
    } as const;
};
