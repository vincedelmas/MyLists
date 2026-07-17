import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {GameDetailsQuery} from "@/lib/server/domain/catalog/games/game-details.query";
import {GameLibraryCommands} from "@/lib/server/domain/library/games/game-library.commands";
import {GameLibraryReadRepository} from "@/lib/server/domain/library/games/game-library-read.repository";
import {GameListReadRepository} from "@/lib/server/domain/library/games/game-list-read.repository";
import {GameStatsReadRepository} from "@/lib/server/domain/library/games/game-stats-read.repository";
import {GameCatalogReadRepository} from "@/lib/server/domain/catalog/games/game-catalog-read.repository";
import {GameCatalogAdminRepository} from "@/lib/server/domain/catalog/games/game-catalog-admin.repository";
import {GameCatalogEditCommand} from "@/lib/server/domain/catalog/games/game-catalog-edit.command";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/catalog/games/game-catalog-ingestion.repository";
import {GameCatalogIngestionCommand} from "@/lib/server/domain/catalog/games/game-catalog-ingestion.command";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createGamesMatcher} from "@/lib/server/domain/imports/matchers/games.matcher";
import {UpComingMedia} from "@/lib/types/notifications.types";
import {GameLibraryRepository} from "@/lib/server/domain/library/games/game-library.repository";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/catalog/catalog-refresh-identity.query";
import {GameCatalogRefreshCandidatesQuery} from "@/lib/server/domain/catalog/games/game-catalog-refresh-candidates.query";
import {GameLibraryCsvExportQuery} from "@/lib/server/domain/library/games/game-library-csv-export.query";
import {GameStatsContributionQuery} from "@/lib/server/domain/library/games/game-stats-contribution.query";
import {LibraryStatsRebuildCommand} from "@/lib/server/domain/library/library-stats-rebuild.command";
import {LibraryTagsQuery} from "@/lib/server/domain/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/catalog/catalog-maintenance";
import {gamesMyListsCSVRowSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {gamesAchievements} from "@/lib/server/domain/achievements/seeds/games.seed";
import {GameAchievementCalculator} from "@/lib/server/domain/achievements/game-achievement-calculator";
import {GameWcfQuery} from "@/lib/server/domain/catalog/games/game-wcf.query";
import {gameActivityDefinition} from "@/lib/utils/activity-utils";
import {CatalogActivityQuery} from "@/lib/server/domain/activity/catalog-activity.query";


export const setupGameMediaModule = (apiClients: ApiClientModule) => {
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
    const statsRebuild = new LibraryStatsRebuildCommand(MediaType.GAMES, new GameStatsContributionQuery());
    const csvExport = new GameLibraryCsvExportQuery();
    const tags = new LibraryTagsQuery(MediaType.GAMES);

    const external = createIgdbGamesProvider(apiClients.igdb);
    const ingestion = createGamesIngestionService(apiClients.hltb, catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getCandidateApiIds(),
    });

    return {
        kind: MediaType.GAMES,
        external,
        imports: {
            matcher: createGamesMatcher(catalogRepository, ingestion, libraryCommands),
            csv: {
                rowSchema: gamesMyListsCSVRowSchema,
            },
        },
        achievements: {
            definitions: gamesAchievements,
            calculator: new GameAchievementCalculator(),
        },
        features: {
            whichCameFirst: new GameWcfQuery(),
        },
        activity: {
            definition: gameActivityDefinition,
            catalog: new CatalogActivityQuery(MediaType.GAMES),
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
                rebuild: () => statsRebuild.rebuild(),
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
