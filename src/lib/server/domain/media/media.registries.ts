import {MediaType} from "@/lib/utils/enums";
import type {TvService, TvStatistics} from "@/lib/server/domain/media/tv";
import type {GamesService, GamesStatistics} from "@/lib/server/domain/media/games";
import type {MangaService, MangaStatistics} from "@/lib/server/domain/media/manga";
import type {BooksService, BooksStatistics} from "@/lib/server/domain/media/books";
import type {MoviesService, MoviesStatistics} from "@/lib/server/domain/media/movies";
import type {MediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";


export type MediaMonthlyActivityRegistry = MediaRegistry<Record<MediaType, MediaMonthlyActivity>>;


export type MediaStatsRegistry = MediaRegistry<{
    [MediaType.SERIES]: TvStatistics;
    [MediaType.ANIME]: TvStatistics;
    [MediaType.MOVIES]: MoviesStatistics;
    [MediaType.GAMES]: GamesStatistics;
    [MediaType.BOOKS]: BooksStatistics;
    [MediaType.MANGA]: MangaStatistics;
}>;


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
