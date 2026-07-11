import {ApiProviderType} from "@/lib/utils/enums";
import {GamesService} from "@/lib/server/domain/media/games/games.service";
import {MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalIGDBGamesMatcher} from "@/lib/server/domain/imports/matchers/external-game.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {GamesImportListWriter} from "@/lib/server/domain/imports/list-writers/games-import-list.writer";


export const createGamesMatcher = (
    gamesService: GamesService,
    gamesIngestion: MediaIngestionService<UpsertGameWithDetails>,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.IGDB, gamesService),
        internalNameDateMatcher(gamesService),
    ],
    externalMatchers: [
        new ExternalIGDBGamesMatcher(gamesIngestion),
    ],
    listWriter: new GamesImportListWriter(gamesService),
});
