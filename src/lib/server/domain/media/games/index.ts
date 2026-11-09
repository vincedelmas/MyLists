import {createGamesService} from "@/lib/server/domain/media/games/games.service";
import {createGamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {createGamesAchievementCatalog} from "@/lib/server/domain/media/games/games.achievements";
import {createGamesMonthlyActivity, createGamesStatistics} from "@/lib/server/domain/media/games/games.statistics";


export function createGamesModule() {
    const definition = gamesServerDefinition;
    const repository = createGamesRepository(definition);

    return {
        repository,
        mediaType: definition.identity.mediaType,
        statistics: createGamesStatistics(definition),
        service: createGamesService(repository, definition),
        achievements: createGamesAchievementCatalog(definition),
        monthlyActivity: createGamesMonthlyActivity(definition, repository),
    };
}


export * from "./games.service";
export * from "./games.repository";
export * from "./games.statistics";
