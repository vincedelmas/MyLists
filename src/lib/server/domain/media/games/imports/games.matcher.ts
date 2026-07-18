import {ApiProviderType} from "@/lib/utils/enums";
import {MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {GameCatalogSnapshot} from "@/lib/server/domain/media/games/catalog/game-catalog-snapshot";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalIGDBGamesMatcher} from "@/lib/server/domain/media/games/imports/external-game.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {GamesImportListWriter} from "@/lib/server/domain/media/games/imports/games-import-list.writer";
import {GameLibraryService} from "@/lib/server/domain/media/games/library/game-library.service";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/media/games/catalog/game-catalog-ingestion.repository";


export const createGamesMatcher = (
    catalog: GameCatalogIngestionRepository,
    gamesIngestion: MediaIngestionService<GameCatalogSnapshot>,
    library: GameLibraryService,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.IGDB, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalIGDBGamesMatcher(gamesIngestion),
    ],
    listWriter: new GamesImportListWriter(library),
});
