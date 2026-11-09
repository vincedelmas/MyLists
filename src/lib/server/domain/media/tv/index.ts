import {createTvService} from "@/lib/server/domain/media/tv/tv.service";
import {createTvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {createTvAchievementCatalog} from "@/lib/server/domain/media/tv/tv.achievements";
import type {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import type {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {createTvMonthlyActivity, createTvStatistics} from "@/lib/server/domain/media/tv/tv.statistics";


export function createTvModule<TDefinition extends AnimeServerDefinition | SeriesServerDefinition>(definition: TDefinition) {
    const repository = createTvRepository(definition);

    return {
        repository,
        statistics: createTvStatistics(definition),
        service: createTvService(repository, definition),
        achievements: createTvAchievementCatalog(definition),
        monthlyActivity: createTvMonthlyActivity(definition, repository),
        mediaType: definition.identity.mediaType as TDefinition["identity"]["mediaType"],
    };
}


export * from "./tv.service";
export * from "./tv.repository";
export * from "./tv.statistics";
export * from "@/lib/media-definitions/tv/anime/anime.definition";
export * from "@/lib/media-definitions/tv/series/series.definition";
