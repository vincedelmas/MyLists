import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {setupTvMediaModule} from "@/lib/server/domain/media/tv/tv-media.module";
import {setupGameMediaModule} from "@/lib/server/domain/media/games/game-media.module";
import {setupBookMediaModule} from "@/lib/server/domain/media/books/book-media.module";
import {setupMovieMediaModule} from "@/lib/server/domain/media/movies/movie-media.module";
import {setupMangaMediaModule} from "@/lib/server/domain/media/manga/manga-media.module";
import {MediaModuleMap, MediaModuleRegistry} from "@/lib/server/domain/media/media-module.registry";


export function setupMediaModule(apiClients: ApiClientModule) {
    const modules: MediaModuleMap = {
        [MediaType.SERIES]: setupTvMediaModule(MediaType.SERIES, { tmdb: apiClients.tmdb, jikan: apiClients.jikan }),
        [MediaType.ANIME]: setupTvMediaModule(MediaType.ANIME, { tmdb: apiClients.tmdb, jikan: apiClients.jikan }),
        [MediaType.MOVIES]: setupMovieMediaModule(apiClients.tmdb),
        [MediaType.BOOKS]: setupBookMediaModule(apiClients.gBook),
        [MediaType.GAMES]: setupGameMediaModule({ igdb: apiClients.igdb, hltb: apiClients.hltb }),
        [MediaType.MANGA]: setupMangaMediaModule(apiClients.jikan),
    };
    return new MediaModuleRegistry(modules);
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
