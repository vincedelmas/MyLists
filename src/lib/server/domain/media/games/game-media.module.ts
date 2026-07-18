import {MediaType} from "@/lib/utils/enums";
import {HltbApi, IgdbApi} from "@/lib/server/api-providers/api";
import {GameDetailsQuery} from "@/lib/server/domain/media/games/catalog/game-details.query";
import {GameLibraryService} from "@/lib/server/domain/media/games/library/game-library.service";
import {GameCatalogReadRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-read.repository";
import {GameCatalogAdminRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-admin.repository";
import {GameCatalogEditCommand} from "@/lib/server/domain/media/games/catalog/game-catalog-edit.command";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-ingestion.repository";
import {GameCatalogIngestionCommand} from "@/lib/server/domain/media/games/catalog/game-catalog-ingestion.command";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/domain/media/games/external/igdb-games.provider";
import {createGamesMatcher} from "@/lib/server/domain/media/games/imports/games.matcher";
import {GameLibraryRepository} from "@/lib/server/domain/media/games/library/game-library.repository";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {GameCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/games/catalog/game-catalog-refresh-candidates.query";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {gamesMyListsCSVRowSchema} from "@/lib/server/domain/media/games/imports/game-import.schemas";
import {gamesAchievements} from "@/lib/server/domain/media/games/achievements/games.seed";
import {GameAchievementCalculator} from "@/lib/server/domain/media/games/achievements/game-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {GameWcfPoolSource} from "@/lib/server/domain/media/games/features/which-came-first/game-wcf-pool-source";
import type {WcfPoolSource} from "@/lib/server/domain/which-came-first/wcf.service";
import {gameActivityDefinition} from "@/lib/server/domain/media/games/activity/game-activity.definition";


export const setupGameMediaModule = (clients: { igdb: IgdbApi; hltb: HltbApi }) => {
    const libraryRepository = new GameLibraryRepository();
    const library = new GameLibraryService(libraryRepository);
    const catalogRead = new GameCatalogReadRepository();
    const catalogAdmin = new GameCatalogAdminRepository();
    const catalogRepository = new GameCatalogIngestionRepository();
    const catalogCommands = new GameCatalogIngestionCommand(catalogRepository);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.GAMES);
    const refreshCandidates = new GameCatalogRefreshCandidatesQuery();

    const external = createIgdbGamesProvider(clients.igdb);
    const ingestion = createGamesIngestionService(clients.hltb, catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.GAMES,
        external,
        contributions: {
            imports: {
                matcher: createGamesMatcher(catalogRepository, ingestion, library),
                csv: {
                    rowSchema: gamesMyListsCSVRowSchema,
                },
            },
            achievements: {
                definitions: gamesAchievements,
                calculator: GameAchievementCalculator satisfies AchievementCalculator,
            },
            activity: {
                definition: gameActivityDefinition,
            },
            whichCameFirst: {
                pool: GameWcfPoolSource satisfies WcfPoolSource,
            },
        },
        catalog: {
            ingestion,
            admin: catalogAdmin,
            details: new GameDetailsQuery(catalogRead, library),
            read: catalogRead,
            edit: new GameCatalogEditCommand(catalogAdmin),
            refresh: {
                identity: refreshIdentity,
                candidates: refreshCandidates,
                selfServiceAllowed: true,
            },
            maintenance: createCatalogMaintenance(MediaType.GAMES),
        },
        library,
    } as const;
};
