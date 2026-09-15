import {ApiProviderType} from "@/lib/utils/enums";
import {GamesService} from "@/lib/server/domain/media/games/games.service";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {ExternalIGDBGamesMatcher} from "@/lib/server/domain/media/games/external-game.matcher";
import {GamesImportListWriter} from "@/lib/server/domain/media/games/games-import-list.writer";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";


export const createGamesMatcher = (
    gamesService: GamesService,
    gamesIngestion: MediaIngestionService,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.IGDB, gamesService),
        internalNameDateMatcher(gamesService, ApiProviderType.IGDB),
    ],
    externalMatchers: [
        new ExternalIGDBGamesMatcher(gamesIngestion),
    ],
    listWriter: new GamesImportListWriter(gamesService),
});
