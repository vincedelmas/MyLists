import {MediaType} from "@/lib/utils/enums";
import {JikanApi} from "@/lib/server/api-providers/api";
import {MangaLibraryService} from "@/lib/server/domain/media/manga/library/manga-library.service";
import {MangaLibraryRepository} from "@/lib/server/domain/media/manga/library/manga-library.repository";
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
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {mangaMyListsCSVRowSchema} from "@/lib/server/domain/media/manga/imports/manga-import.schemas";
import {mangaAchievements} from "@/lib/server/domain/media/manga/achievements/manga.seed";
import {MangaAchievementCalculator} from "@/lib/server/domain/media/manga/achievements/manga-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {MangaWcfPoolSource} from "@/lib/server/domain/media/manga/features/which-came-first/manga-wcf-pool-source";
import type {WcfPoolSource} from "@/lib/server/domain/which-came-first/wcf.service";
import {mangaActivityDefinition} from "@/lib/server/domain/media/manga/activity/manga-activity.definition";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {CommonLibraryService} from "@/lib/server/domain/media/shared/library/common-library.service";


export const setupMangaMediaModule = (
    jikan: JikanApi,
) => {
    const commonLibraryRepository = new CommonLibraryRepository(MediaType.MANGA);
    const libraryRepository = new MangaLibraryRepository(commonLibraryRepository);
    const library = new MangaLibraryService(
        libraryRepository,
        new CommonLibraryService(commonLibraryRepository),
    );
    const catalogRead = new MangaCatalogReadRepository();
    const catalogRepository = new MangaCatalogIngestionRepository();
    const catalogCommands = new MangaCatalogIngestionCommand(catalogRepository, library);
    const catalogAdmin = new MangaCatalogAdminRepository();
    const external = createJikanMangaProvider(jikan);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.MANGA);
    const refreshCandidates = new MangaCatalogRefreshCandidatesQuery();
    const ingestion = createMangaIngestionService(catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.MANGA,
        catalog: {
            details: new MangaDetailsQuery(catalogRead, library),
            read: catalogRead,
            admin: catalogAdmin,
            edit: new MangaCatalogEditCommand(catalogAdmin, library),
            ingestion,
            refresh: {
                identity: refreshIdentity,
                candidates: refreshCandidates,
                selfServiceAllowed: true,
            },
            maintenance: createCatalogMaintenance(MediaType.MANGA),
        },
        library,
        external,
        contributions: {
            imports: {
                matcher: createMangaMatcher(catalogRepository, external, ingestion, library),
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
