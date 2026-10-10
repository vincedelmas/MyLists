import type z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import {animeDefinition} from "@/lib/media-definitions/tv/anime/anime.definition";
import {moviesDefinition} from "@/lib/media-definitions/movies/movies.definition";
import type {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {seriesDefinition} from "@/lib/media-definitions/tv/series/series.definition";


export type MediaMetadataFilterKey = MediaFilterKeyFor<MediaType>;
type DeclaredMediaFilterSchemas = typeof mediaDefinitions[MediaType]["filters"]["metadata"];
export type MediaMetadataFilters = { [Key in MediaMetadataFilterKey]?: z.infer<MediaMetadataFilterSchemas[Key]> };


export type MediaFilterKeyFor<T extends MediaType> = T extends MediaType
    ? Extract<keyof typeof mediaDefinitions[T]["filters"]["metadata"], string>
    : never;


type MediaCommonFilterKeyFor<T extends MediaType> = T extends MediaType
    ? Extract<keyof typeof mediaDefinitions[T]["filters"]["common"], string>
    : never;


export type MediaCommonFilterKey = MediaCommonFilterKeyFor<MediaType>;
type DeclaredCommonFilterSchemas = typeof mediaDefinitions[MediaType]["filters"]["common"];
export type MediaCommonFilters = { [Key in MediaCommonFilterKey]?: z.infer<MediaCommonFilterSchemas[Key]> };


export type MediaCommonFilterSchemas = {
    [Key in MediaCommonFilterKey]: Extract<DeclaredCommonFilterSchemas, Record<Key, z.ZodType>>[Key];
};


export type MediaMetadataFilterSchemas = {
    [Key in MediaMetadataFilterKey]: Extract<DeclaredMediaFilterSchemas, Record<Key, z.ZodArray<z.ZodType<string>>>>[Key];
};


export const ALL_MEDIA_TYPES = [
    MediaType.SERIES,
    MediaType.ANIME,
    MediaType.MOVIES,
    MediaType.BOOKS,
    MediaType.GAMES,
    MediaType.MANGA,
] as const satisfies readonly MediaType[];


const mediaDefinitions = {
    [MediaType.SERIES]: seriesDefinition,
    [MediaType.ANIME]: animeDefinition,
    [MediaType.MOVIES]: moviesDefinition,
    [MediaType.GAMES]: gamesDefinition,
    [MediaType.BOOKS]: booksDefinition,
    [MediaType.MANGA]: mangaDefinition,
} satisfies { [T in MediaType]: MediaDefinition<T> };


export const mediaCommonFilterSchemas = Object.fromEntries(
    ALL_MEDIA_TYPES.flatMap(mediaType => Object.entries(mediaDefinitions[mediaType].filters.common)),
) as MediaCommonFilterSchemas;


export function getMediaDefinition<T extends MediaType>(mediaType: T): Omit<MediaDefinition<T>, "filters"> & {
    filters: typeof mediaDefinitions[T]["filters"];
};


export function getMediaDefinition(mediaType: MediaType) {
    return mediaDefinitions[mediaType];
}
