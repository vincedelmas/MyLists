import {MediaType} from "@/lib/utils/enums";
import {JikanApi} from "@/lib/server/api-providers/api";
import {MangaLibraryCommands} from "@/lib/server/domain/media/manga/library/manga-library.commands";
import {MangaLibraryRepository} from "@/lib/server/domain/media/manga/library/manga-library.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/media/manga/library/manga-library-read.repository";
import {MangaListReadRepository} from "@/lib/server/domain/media/manga/library/manga-list-read.repository";
import {MangaStatsReadRepository} from "@/lib/server/domain/media/manga/library/manga-stats-read.repository";
import {MangaDetailsQuery} from "@/lib/server/domain/media/manga/catalog/manga-details.query";
import {MangaCatalogReadRepository} from "@/lib/server/domain/media/manga/catalog/manga-catalog-read.repository";
import {MangaCatalogAdminRepository} from "@/lib/server/domain/media/manga/catalog/manga-catalog-admin.repository";
import {MangaCatalogEditCommand} from "@/lib/server/domain/media/manga/catalog/manga-catalog-edit.command";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/media/manga/catalog/manga-catalog-ingestion.repository";
import {MangaCatalogIngestionCommand} from "@/lib/server/domain/media/manga/catalog/manga-catalog-ingestion.command";
import {createJikanMangaProvider, createMangaIngestionService} from "@/lib/server/domain/media/manga/external/jikan-manga.provider";
import {createMangaMatcher} from "@/lib/server/domain/media/manga/imports/manga.matcher";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {MangaCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/manga/catalog/manga-catalog-refresh-candidates.query";
import {MangaLibraryCsvExportQuery} from "@/lib/server/domain/media/manga/library/manga-library-csv-export.query";
import {getMangaStatsContributions} from "@/lib/server/domain/media/manga/library/manga-stats-contributions";
import {createLibraryStatsRebuild} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {mangaMyListsCSVRowSchema} from "@/lib/server/domain/media/manga/imports/manga-import.schemas";
import {mangaAchievements} from "@/lib/server/domain/media/manga/achievements/manga.seed";
import {MangaAchievementCalculator} from "@/lib/server/domain/media/manga/achievements/manga-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {MangaWcfQuery} from "@/lib/server/domain/media/manga/features/which-came-first/manga-wcf.query";
import {mangaActivityDefinition} from "@/lib/server/domain/media/manga/activity/manga-activity.definition";
import {CatalogActivityQuery} from "@/lib/server/domain/media/shared/activity/catalog-activity.query";


export const setupMangaMediaModule = (
    jikan: JikanApi,
) => {
    const libraryRepository = new MangaLibraryRepository();
    const libraryCommands = new MangaLibraryCommands(libraryRepository);
    const libraryRead = new MangaLibraryReadRepository(libraryRepository);
    const catalogRead = new MangaCatalogReadRepository();
    const catalogRepository = new MangaCatalogIngestionRepository();
    const catalogCommands = new MangaCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);
    const catalogAdmin = new MangaCatalogAdminRepository();
    const external = createJikanMangaProvider(jikan);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.MANGA);
    const refreshCandidates = new MangaCatalogRefreshCandidatesQuery();
    const statsRead = new MangaStatsReadRepository();
    const csvExport = new MangaLibraryCsvExportQuery();
    const tags = new LibraryTagsQuery(MediaType.MANGA);
    const ingestion = createMangaIngestionService(catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.MANGA,
        catalog: {
            details: new MangaDetailsQuery(catalogRead, libraryRead),
            read: catalogRead,
            admin: catalogAdmin,
            edit: new MangaCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands),
            ingestion,
            refresh: {
                identity: refreshIdentity,
                candidates: refreshCandidates,
                selfServiceAllowed: true,
            },
            maintenance: createCatalogMaintenance(MediaType.MANGA),
        },
        library: {
            commands: libraryCommands,
            read: libraryRead,
            list: new MangaListReadRepository(),
            export: {
                csv: (userId: number) => csvExport.export(userId),
            },
            stats: {
                read: statsRead,
                rebuild: createLibraryStatsRebuild({ kind: MediaType.MANGA, getContributions: getMangaStatsContributions }),
            },
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Parameters<MangaLibraryCommands["editTag"]>[0]) => libraryCommands.editTag(params),
            },
            covers: new LibraryCustomCoverCommand(MediaType.MANGA, libraryRead, libraryCommands),
        },
        external,
        contributions: {
            imports: {
                matcher: createMangaMatcher(catalogRepository, external, ingestion, libraryCommands),
                csv: {
                    rowSchema: mangaMyListsCSVRowSchema,
                },
            },
            achievements: {
                definitions: mangaAchievements,
                calculator: MangaAchievementCalculator satisfies AchievementCalculator,
            },
            activity: {
                definition: mangaActivityDefinition,
                catalog: new CatalogActivityQuery(MediaType.MANGA),
            },
            whichCameFirst: {
                catalog: new MangaWcfQuery(),
            },
        },
    } as const;
};
