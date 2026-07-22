import {MediaType} from "@/lib/utils/enums";
import type {TvService} from "@/lib/server/domain/media/tv";
import type {GamesService} from "@/lib/server/domain/media/games";
import type {MangaService} from "@/lib/server/domain/media/manga";
import type {BooksService} from "@/lib/server/domain/media/books";
import type {MoviesService} from "@/lib/server/domain/media/movies";


export type MediaServiceRegistry = MediaRegistry<{
    [MediaType.SERIES]: TvService;
    [MediaType.ANIME]: TvService;
    [MediaType.MOVIES]: MoviesService;
    [MediaType.GAMES]: GamesService;
    [MediaType.BOOKS]: BooksService;
    [MediaType.MANGA]: MangaService;
}>;


export type MediaRegistry<TEntries extends Record<MediaType, unknown>> = {
    get<TMediaType extends MediaType>(mediaType: TMediaType): TEntries[TMediaType];
};


export const createMediaRegistry = <const TEntries extends Record<MediaType, unknown>>(entries: TEntries): MediaRegistry<TEntries> => {
    const immutableEntries = Object.freeze({ ...entries }) as Readonly<TEntries>;

    return Object.freeze({
        get<TMediaType extends MediaType>(mediaType: TMediaType) {
            return immutableEntries[mediaType];
        },
    });
};
