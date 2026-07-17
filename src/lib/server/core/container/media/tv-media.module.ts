import {MediaType} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {TvDetailsQuery} from "@/lib/server/domain/catalog/tv/tv-details.query";
import {createTvMatcher} from "@/lib/server/domain/imports/matchers/tv.matcher";
import {TvLibraryCommands} from "@/lib/server/domain/library/tv/tv-library.commands";
import {TvLibraryRepository} from "@/lib/server/domain/library/tv/tv-library.repository";
import {TvCatalogEditCommand} from "@/lib/server/domain/catalog/tv/tv-catalog-edit.command";
import {TvListReadRepository} from "@/lib/server/domain/library/tv/tv-list-read.repository";
import {TvStatsReadRepository} from "@/lib/server/domain/library/tv/tv-stats-read.repository";
import {TvLibraryReadRepository} from "@/lib/server/domain/library/tv/tv-library-read.repository";
import {TvCatalogReadRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-read.repository";
import {TvCatalogAdminRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-admin.repository";
import {TvCatalogIngestionCommand} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.command";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.repository";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";
import {CatalogCoverStorage} from "@/lib/server/domain/catalog/catalog-edit.shared";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/catalog/catalog-refresh-identity.query";
import {TvCatalogRefreshCandidatesQuery} from "@/lib/server/domain/catalog/tv/tv-catalog-refresh-candidates.query";
import {TvLibraryCsvExportQuery} from "@/lib/server/domain/library/tv/tv-library-csv-export.query";
import {TvStatsContributionQuery} from "@/lib/server/domain/library/tv/tv-stats-contribution.query";
import {LibraryStatsRebuildCommand} from "@/lib/server/domain/library/library-stats-rebuild.command";
import {LibraryTagsQuery} from "@/lib/server/domain/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/catalog/catalog-maintenance";
import {animeMyListsCSVRowSchema, seriesMyListsCSVRowSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {seriesAchievements} from "@/lib/server/domain/achievements/seeds/series.seed";
import {animeAchievements} from "@/lib/server/domain/achievements/seeds/anime.seed";
import {TvAchievementCalculator} from "@/lib/server/domain/achievements/tv-achievement-calculator";
import {TvWcfQuery} from "@/lib/server/domain/catalog/tv/tv-wcf.query";
import {TvUpcomingNotificationCommand} from "@/lib/server/domain/library/tv/tv-upcoming-notification.command";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import {tvActivityDefinition} from "@/lib/utils/activity-utils";
import {CatalogActivityQuery} from "@/lib/server/domain/activity/catalog-activity.query";
import {TvActivityDurationQuery} from "@/lib/server/domain/activity/tv-activity-duration.query";


export const setupTvMediaModule = <K extends TvMediaType>(
    kind: K,
    apiClients: ApiClientModule,
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
    const statsRebuild = new LibraryStatsRebuildCommand(kind, new TvStatsContributionQuery(kind));
    const csvExport = new TvLibraryCsvExportQuery(kind);
    const tags = new LibraryTagsQuery(kind);
    const upcomingNotifications = new TvUpcomingNotificationCommand(kind, list, NotificationsRepository);

    const external = (kind === MediaType.ANIME)
        ? createTmdbAnimeProvider(apiClients.tmdb)
        : createTmdbSeriesProvider(apiClients.tmdb);

    const refreshSource = {
        async getCandidateApiIds() {
            const changedIds = await external.changedIds?.getChangedIds() ?? [];
            return refreshCandidates.getCandidateApiIds(changedIds);
        },
    };

    const ingestion = (kind === MediaType.SERIES)
        ? createSeriesIngestionService(catalogCommands, external, refreshSource)
        : createAnimeIngestionService(apiClients.jikan, catalogCommands, external, refreshSource);

    return {
        kind,
        external,
        imports: {
            matcher: createTvMatcher(kind, catalogRepository, external, ingestion, libraryCommands),
            csv: {
                rowSchema: kind === MediaType.SERIES ? seriesMyListsCSVRowSchema : animeMyListsCSVRowSchema,
            },
        },
        achievements: {
            definitions: kind === MediaType.SERIES ? seriesAchievements : animeAchievements,
            calculator: new TvAchievementCalculator(kind),
        },
        features: {
            whichCameFirst: new TvWcfQuery(kind),
        },
        notifications: {
            upcoming: upcomingNotifications,
        },
        activity: {
            definition: tvActivityDefinition,
            catalog: new CatalogActivityQuery(kind, new TvActivityDurationQuery(kind)),
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
                rebuild: () => statsRebuild.rebuild(),
            },
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Omit<Parameters<TvLibraryCommands["editTag"]>[0], "kind">) => {
                    return libraryCommands.editTag({ ...params, kind });
                },
            },
            covers: new LibraryCustomCoverCommand(kind, libraryRead, libraryCommands),
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
