import {MediaType} from "@/lib/utils/enums";
import {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {mangaDefinition} from "@/lib/media-definitions/manga/manga.definition";
import {animeDefinition} from "@/lib/media-definitions/tv/anime/anime.definition";
import {moviesDefinition} from "@/lib/media-definitions/movies/movies.definition";
import {seriesDefinition} from "@/lib/media-definitions/tv/series/series.definition";


const mediaDefinitions = {
    [MediaType.SERIES]: seriesDefinition,
    [MediaType.ANIME]: animeDefinition,
    [MediaType.MOVIES]: moviesDefinition,
    [MediaType.GAMES]: gamesDefinition,
    [MediaType.BOOKS]: booksDefinition,
    [MediaType.MANGA]: mangaDefinition,
} as const satisfies Record<MediaType, MediaDefinition>;


export const getMediaDefinition = (mediaType: MediaType): MediaDefinition => {
    return mediaDefinitions[mediaType];
};
