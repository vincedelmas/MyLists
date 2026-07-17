import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {MangaLibraryCommands} from "@/lib/server/domain/library/manga/manga-library.commands";
import {MangaLibraryRepository} from "@/lib/server/domain/library/manga/manga-library.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/library/manga/manga-library-read.repository";
import {MangaListReadRepository} from "@/lib/server/domain/library/manga/manga-list-read.repository";
import {MangaStatsReadRepository} from "@/lib/server/domain/library/manga/manga-stats-read.repository";
import {MangaDetailsQuery} from "@/lib/server/domain/catalog/manga/manga-details.query";
import {MangaCatalogReadRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-read.repository";
import {MangaCatalogAdminRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-admin.repository";
import {MangaCatalogEditCommand} from "@/lib/server/domain/catalog/manga/manga-catalog-edit.command";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.repository";
import {MangaCatalogIngestionCommand} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.command";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {createJikanMangaProvider, createMangaIngestionService} from "@/lib/server/api-providers/jikan-manga.provider";
import {createMangaMatcher} from "@/lib/server/domain/imports/matchers/manga.matcher";


export const setupMangaMediaModule = (
    apiClients: ApiClientModule,
    refreshCandidates: CatalogRefreshCandidateRepository,
) => {
    const libraryRepository = new MangaLibraryRepository();
    const libraryCommands = new MangaLibraryCommands(libraryRepository);
    const catalogRepository = new MangaCatalogIngestionRepository();
    const catalogCommands = new MangaCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);
    const catalogAdmin = new MangaCatalogAdminRepository();
    const external = createJikanMangaProvider(apiClients.jikan);
    const ingestion = createMangaIngestionService(catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getMangaCandidateApiIds(),
    });

    return {
        kind: MediaType.MANGA,
        catalog: {
            details: new MangaDetailsQuery(),
            read: new MangaCatalogReadRepository(),
            admin: catalogAdmin,
            edit: new MangaCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands),
            ingestion,
            refreshIdentity: {
                get: (catalogItemId: number) => refreshCandidates.getItemIdentity(MediaType.MANGA, catalogItemId),
            },
        },
        library: {
            commands: libraryCommands,
            read: new MangaLibraryReadRepository(),
            list: new MangaListReadRepository(),
            stats: new MangaStatsReadRepository(),
        },
        external,
        imports: {
            matcher: createMangaMatcher(catalogRepository, external, ingestion, libraryCommands),
        },
    } as const;
};

