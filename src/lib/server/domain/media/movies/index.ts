import {createMoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {createMoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {createMoviesAchievementCatalog} from "@/lib/server/domain/media/movies/movies.achievements";
import {createMoviesMonthlyActivity, createMoviesStatistics} from "@/lib/server/domain/media/movies/movies.statistics";


export function createMoviesModule() {
    const definition = moviesServerDefinition;
    const repository = createMoviesRepository(definition);

    return {
        repository,
        mediaType: definition.identity.mediaType,
        statistics: createMoviesStatistics(definition),
        service: createMoviesService(repository, definition),
        achievements: createMoviesAchievementCatalog(definition),
        monthlyActivity: createMoviesMonthlyActivity(definition, repository),
    };
}


export * from "./movies.service";
export * from "./movies.repository";
export * from "./movies.statistics";
