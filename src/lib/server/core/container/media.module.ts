import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {setupTvMediaModule} from "@/lib/server/core/container/media/tv-media.module";
import {setupGameMediaModule} from "@/lib/server/core/container/media/game-media.module";
import {setupBookMediaModule} from "@/lib/server/core/container/media/book-media.module";
import {setupMovieMediaModule} from "@/lib/server/core/container/media/movie-media.module";
import {setupMangaMediaModule} from "@/lib/server/core/container/media/manga-media.module";
import {MediaModuleMap, MediaModuleRegistry} from "@/lib/server/core/container/media/media-module.registry";


export function setupMediaModule(apiClients: ApiClientModule) {
    const modules: MediaModuleMap = {
        [MediaType.SERIES]: setupTvMediaModule(MediaType.SERIES, apiClients),
        [MediaType.ANIME]: setupTvMediaModule(MediaType.ANIME, apiClients),
        [MediaType.MOVIES]: setupMovieMediaModule(apiClients),
        [MediaType.GAMES]: setupGameMediaModule(apiClients),
        [MediaType.BOOKS]: setupBookMediaModule(apiClients),
        [MediaType.MANGA]: setupMangaMediaModule(apiClients),
    };
    return new MediaModuleRegistry(modules);
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
