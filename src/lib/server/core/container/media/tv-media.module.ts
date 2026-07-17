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
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";


export const setupTvMediaModule = <K extends TvMediaType>(
    kind: K,
    apiClients: ApiClientModule,
    refreshCandidates: CatalogRefreshCandidateRepository,
) => {
    const list = new TvListReadRepository(kind);
    const libraryRepository = new TvLibraryRepository();
    const catalogAdmin = new TvCatalogAdminRepository(kind);
    const libraryCommands = new TvLibraryCommands(libraryRepository);
    const catalogRepository = new TvCatalogIngestionRepository(kind);
    const catalogEdit = new TvCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands);
    const catalogCommands = new TvCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);

    const external = (kind === MediaType.ANIME)
        ? createTmdbAnimeProvider(apiClients.tmdb)
        : createTmdbSeriesProvider(apiClients.tmdb);

    const refreshSource = {
        async getCandidateApiIds() {
            const changedIds = await external.changedIds?.getChangedIds() ?? [];
            return refreshCandidates.getTvCandidateApiIds(kind, changedIds);
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
        },
        catalog: {
            ingestion,
            edit: catalogEdit,
            admin: catalogAdmin,
            details: new TvDetailsQuery(kind),
            read: new TvCatalogReadRepository(kind),
            refreshIdentity: {
                get: (catalogItemId: number) => {
                    return refreshCandidates.getItemIdentity(kind, catalogItemId);
                },
            },
        },
        library: {
            list,
            commands: libraryCommands,
            stats: new TvStatsReadRepository(kind),
            read: new TvLibraryReadRepository(kind),
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
