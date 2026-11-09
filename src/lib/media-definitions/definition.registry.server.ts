import {MediaType} from "@/lib/utils/enums";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {mangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import type {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";


export type ServerMediaDefinitionFor<T extends MediaType> = typeof serverMediaDefinitions[T];


const definitions = [
    seriesServerDefinition,
    animeServerDefinition,
    moviesServerDefinition,
    gamesServerDefinition,
    booksServerDefinition,
    mangaServerDefinition,
] as const;


const serverMediaDefinitions = Object.fromEntries(definitions.map(definition => [definition.identity.mediaType, definition])) as {
    [Definition in typeof definitions[number] as Definition["identity"]["mediaType"]]: Definition;
} satisfies Record<MediaType, AnyServerMediaDefinition>;


export const getServerMediaDefinition = (mediaType: MediaType): AnyServerMediaDefinition => {
    return serverMediaDefinitions[mediaType];
};
