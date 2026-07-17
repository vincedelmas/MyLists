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
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createGamesMatcher} from "@/lib/server/domain/imports/matchers/games.matcher";
import {UpComingMedia} from "@/lib/types/notifications.types";


export const setupGameMediaModule = (apiClients: ApiClientModule, refreshCandidates: CatalogRefreshCandidateRepository) => {
    const list = new GameListReadRepository();
    const libraryCommands = new GameLibraryCommands();
    const catalogAdmin = new GameCatalogAdminRepository();
    const catalogRepository = new GameCatalogIngestionRepository();
    const catalogCommands = new GameCatalogIngestionCommand(catalogRepository);

    const external = createIgdbGamesProvider(apiClients.igdb);
    const ingestion = createGamesIngestionService(apiClients.hltb, catalogCommands, external, {
        getCandidateApiIds: () => refreshCandidates.getGameCandidateApiIds(),
    });

    return {
        kind: MediaType.GAMES,
        external,
        imports: {
            matcher: createGamesMatcher(catalogRepository, ingestion, libraryCommands),
        },
        catalog: {
            ingestion,
            admin: catalogAdmin,
            details: new GameDetailsQuery(),
            read: new GameCatalogReadRepository(),
            edit: new GameCatalogEditCommand(catalogAdmin),
            refreshIdentity: {
                get: (catalogItemId: number) => {
                    return refreshCandidates.getItemIdentity(MediaType.GAMES, catalogItemId);
                },
            },
        },
        library: {
            list,
            commands: libraryCommands,
            stats: new GameStatsReadRepository(),
            read: new GameLibraryReadRepository(),
            upcoming: {
                async forOwner(ownerId: number): Promise<UpComingMedia[]> {
                    return list.getUpcomingMedia({ ownerId, actorId: ownerId, reason: "owner", mediaTypeEnabled: true });
                },
            },
        },
    } as const;
};
