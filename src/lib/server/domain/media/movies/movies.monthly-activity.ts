import {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {MovieServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";


export function createMoviesMonthlyActivity(definition: MovieServerDefinition, repository: MoviesRepository) {
    const { duration: durationColumn } = definition.repository.tables.mediaTable;

    return createMediaMonthlyActivity({
        definition,
        repository,
        durationColumn,
    });
}
