import {MediaType} from "@/lib/utils/enums";
import {setupTvMediaModule} from "@/lib/server/domain/media/tv/tv-media.module";
import {setupGameMediaModule} from "@/lib/server/domain/media/games/game-media.module";
import {setupBookMediaModule} from "@/lib/server/domain/media/books/book-media.module";
import {setupMangaMediaModule} from "@/lib/server/domain/media/manga/manga-media.module";
import {setupMovieMediaModule} from "@/lib/server/domain/media/movies/movie-media.module";


export interface MediaModuleMap {
    [MediaType.SERIES]: ReturnType<typeof setupTvMediaModule<typeof MediaType.SERIES>>;
    [MediaType.ANIME]: ReturnType<typeof setupTvMediaModule<typeof MediaType.ANIME>>;
    [MediaType.MOVIES]: ReturnType<typeof setupMovieMediaModule>;
    [MediaType.GAMES]: ReturnType<typeof setupGameMediaModule>;
    [MediaType.BOOKS]: ReturnType<typeof setupBookMediaModule>;
    [MediaType.MANGA]: ReturnType<typeof setupMangaMediaModule>;
}


export type MediaModule = MediaModuleMap[MediaType];


export class MediaModuleRegistry {
    private readonly modules: Readonly<MediaModuleMap>;

    constructor(modules: MediaModuleMap) {
        this.modules = Object.freeze({ ...modules });
    }

    get<K extends MediaType>(kind: K): MediaModuleMap[K] {
        return this.modules[kind];
    }

    values(): MediaModule[] {
        return Object.values(this.modules);
    }
}
