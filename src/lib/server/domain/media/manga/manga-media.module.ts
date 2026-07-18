import {MediaType} from "@/lib/utils/enums";
import {JikanApi} from "@/lib/server/api-providers/api";
import {MangaLibraryCommands} from "@/lib/server/domain/media/manga/library/manga-library.commands";
import {MangaLibraryRepository} from "@/lib/server/domain/media/manga/library/manga-library.repository";
import {MangaLibraryReadRepository} from "@/lib/server/domain/media/manga/library/manga-library-read.repository";
import {MangaListReadRepository} from "@/lib/server/domain/media/manga/library/manga-list-read.repository";
import {MangaStatsRepository} from "@/lib/server/domain/media/manga/library/manga-stats.repository";
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
import {exportMangaLibraryCsv} from "@/lib/server/domain/media/manga/library/manga-library-csv-export";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {mangaMyListsCSVRowSchema} from "@/lib/server/domain/media/manga/imports/manga-import.schemas";
import {mangaAchievements} from "@/lib/server/domain/media/manga/achievements/manga.seed";
import {MangaAchievementCalculator} from "@/lib/server/domain/media/manga/achievements/manga-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {MangaWcfPoolSource} from "@/lib/server/domain/media/manga/features/which-came-first/manga-wcf-pool-source";
import type {WcfPoolSource} from "@/lib/server/domain/which-came-first/wcf.service";
import {mangaActivityDefinition} from "@/lib/server/domain/media/manga/activity/manga-activity.definition";


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
                csv: exportMangaLibraryCsv,
            },
            stats: MangaStatsRepository,
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
            },
            whichCameFirst: {
                pool: MangaWcfPoolSource satisfies WcfPoolSource,
            },
        },
    } as const;
};
