import {MediaType} from "@/lib/utils/enums";
import {HltbApi, IgdbApi} from "@/lib/server/api-providers/api";
import {GameDetailsQuery} from "@/lib/server/domain/media/games/catalog/game-details.query";
import {GameLibraryCommands} from "@/lib/server/domain/media/games/library/game-library.commands";
import {GameLibraryReadRepository} from "@/lib/server/domain/media/games/library/game-library-read.repository";
import {GameListReadRepository} from "@/lib/server/domain/media/games/library/game-list-read.repository";
import {GameStatsReadRepository} from "@/lib/server/domain/media/games/library/game-stats-read.repository";
import {GameCatalogReadRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-read.repository";
import {GameCatalogAdminRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-admin.repository";
import {GameCatalogEditCommand} from "@/lib/server/domain/media/games/catalog/game-catalog-edit.command";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-ingestion.repository";
import {GameCatalogIngestionCommand} from "@/lib/server/domain/media/games/catalog/game-catalog-ingestion.command";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/domain/media/games/external/igdb-games.provider";
import {createGamesMatcher} from "@/lib/server/domain/media/games/imports/games.matcher";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {GameLibraryRepository} from "@/lib/server/domain/media/games/library/game-library.repository";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {GameCatalogRefreshCandidatesQuery} from "@/lib/server/domain/media/games/catalog/game-catalog-refresh-candidates.query";
import {GameLibraryCsvExportQuery} from "@/lib/server/domain/media/games/library/game-library-csv-export.query";
import {getGameStatsContributions} from "@/lib/server/domain/media/games/library/game-stats-contributions";
import {createLibraryStatsRebuild} from "@/lib/server/domain/media/shared/library/library-stats-rebuild";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {gamesMyListsCSVRowSchema} from "@/lib/server/domain/media/games/imports/game-import.schemas";
import {gamesAchievements} from "@/lib/server/domain/media/games/achievements/games.seed";
import {GameAchievementCalculator} from "@/lib/server/domain/media/games/achievements/game-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {GameWcfQuery} from "@/lib/server/domain/media/games/features/which-came-first/game-wcf.query";
import {gameActivityDefinition} from "@/lib/server/domain/media/games/activity/game-activity.definition";
import {CatalogActivityQuery} from "@/lib/server/domain/media/shared/activity/catalog-activity.query";


export const setupGameMediaModule = (clients: { igdb: IgdbApi; hltb: HltbApi }) => {
    const list = new GameListReadRepository();
    const libraryRepository = new GameLibraryRepository();
    const libraryCommands = new GameLibraryCommands(libraryRepository);
    const libraryRead = new GameLibraryReadRepository(libraryRepository);
    const catalogRead = new GameCatalogReadRepository();
    const catalogAdmin = new GameCatalogAdminRepository();
    const catalogRepository = new GameCatalogIngestionRepository();
    const catalogCommands = new GameCatalogIngestionCommand(catalogRepository);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.GAMES);
    const refreshCandidates = new GameCatalogRefreshCandidatesQuery();
    const statsRead = new GameStatsReadRepository();
    const csvExport = new GameLibraryCsvExportQuery();
    const tags = new LibraryTagsQuery(MediaType.GAMES);

    const external = createIgdbGamesProvider(clients.igdb);
    const ingestion = createGamesIngestionService(clients.hltb, catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.GAMES,
        external,
        contributions: {
            imports: {
                matcher: createGamesMatcher(catalogRepository, ingestion, libraryCommands),
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
                catalog: new CatalogActivityQuery(MediaType.GAMES),
            },
            whichCameFirst: {
                catalog: new GameWcfQuery(),
            },
        },
        catalog: {
            ingestion,
            admin: catalogAdmin,
            details: new GameDetailsQuery(catalogRead, libraryRead),
            read: catalogRead,
            edit: new GameCatalogEditCommand(catalogAdmin),
            refresh: {
                identity: refreshIdentity,
                candidates: refreshCandidates,
                selfServiceAllowed: true,
            },
            maintenance: createCatalogMaintenance(MediaType.GAMES),
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
                rebuild: createLibraryStatsRebuild({ kind: MediaType.GAMES, getContributions: getGameStatsContributions }),
            },
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Parameters<GameLibraryCommands["editTag"]>[0]) => libraryCommands.editTag(params),
            },
            covers: new LibraryCustomCoverCommand(MediaType.GAMES, libraryRead, libraryCommands),
            upcoming: {
                async forOwner(ownerId: number): Promise<UpComingMedia[]> {
                    return list.getUpcomingMedia({ ownerId, actorId: ownerId, reason: "owner", mediaTypeEnabled: true });
                },
            },
        },
    } as const;
};
