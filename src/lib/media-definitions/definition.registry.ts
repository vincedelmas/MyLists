import {MediaType} from "@/lib/utils/enums";
import {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import {animeDefinition} from "@/lib/media-definitions/tv/anime/anime.definition";
import {moviesDefinition} from "@/lib/media-definitions/movies/movies.definition";
import {seriesDefinition} from "@/lib/media-definitions/tv/series/series.definition";


export const ALL_MEDIA_TYPES = [
    MediaType.SERIES,
    MediaType.ANIME,
    MediaType.MOVIES,
    MediaType.BOOKS,
    MediaType.GAMES,
    MediaType.MANGA,
] as const satisfies readonly MediaType[];


const mediaDefinitions: { [T in MediaType]: MediaDefinition<T> } = {
    [MediaType.SERIES]: seriesDefinition,
    [MediaType.ANIME]: animeDefinition,
    [MediaType.MOVIES]: moviesDefinition,
    [MediaType.GAMES]: gamesDefinition,
    [MediaType.BOOKS]: booksDefinition,
    [MediaType.MANGA]: mangaDefinition,
};


export const getMediaDefinition = <T extends MediaType>(mediaType: T): MediaDefinition<T> => {
    return mediaDefinitions[mediaType];
};
