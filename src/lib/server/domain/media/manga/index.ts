import {createMangaService} from "@/lib/server/domain/media/manga/manga.service";
import {createMangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {mangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {createMangaAchievementCatalog} from "@/lib/server/domain/media/manga/manga.achievements";
import {createMangaMonthlyActivity, createMangaStatistics} from "@/lib/server/domain/media/manga/manga.statistics";


export function createMangaModule() {
    const definition = mangaServerDefinition;
    const repository = createMangaRepository(definition);

    return {
        repository,
        mediaType: definition.identity.mediaType,
        statistics: createMangaStatistics(definition),
        service: createMangaService(repository, definition),
        achievements: createMangaAchievementCatalog(definition),
        monthlyActivity: createMangaMonthlyActivity(definition, repository),
    };
}


export * from "./manga.service";
export * from "./manga.repository";
export * from "./manga.statistics";
