import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


type TVServerDefinition = AnimeServerDefinition | SeriesServerDefinition;


export function createTvMonthlyActivity(definition: TVServerDefinition, repository: TvRepository) {
    const { duration: durationColumn } = definition.repository.tables.mediaTable;

    return createMediaMonthlyActivity({
        definition,
        repository,
        durationColumn,
    });
}
