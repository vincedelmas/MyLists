import {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {MangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";


export function createMangaMonthlyActivity(definition: MangaServerDefinition, repository: MangaRepository) {
    return createMediaMonthlyActivity({ definition, repository });
}
