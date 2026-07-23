import {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {GamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";


export function createGamesMonthlyActivity(definition: GamesServerDefinition, repository: GamesRepository) {
    return createMediaMonthlyActivity({
        definition,
        repository,
        progressFromDelta: (delta) => delta.timeSpent ?? 0,
    });
}
