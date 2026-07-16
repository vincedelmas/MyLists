import {ApiProviderType} from "@/lib/utils/enums";
import {MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {UpsertGameWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalIGDBGamesMatcher} from "@/lib/server/domain/imports/matchers/external-game.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {GamesImportListWriter} from "@/lib/server/domain/imports/list-writers/games-import-list.writer";
import {GameLibraryWriter} from "@/lib/server/domain/library/games/game-library.writer";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/catalog/games/game-catalog-ingestion.repository";


export const createGamesMatcher = (
    catalog: GameCatalogIngestionRepository,
    gamesIngestion: MediaIngestionService<UpsertGameWithDetails>,
    libraryWriter: GameLibraryWriter,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.IGDB, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalIGDBGamesMatcher(gamesIngestion),
    ],
    listWriter: new GamesImportListWriter(libraryWriter),
});
