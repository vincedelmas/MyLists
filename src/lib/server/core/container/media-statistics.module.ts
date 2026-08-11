import {MediaType} from "@/lib/utils/enums";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {createTvStatistics} from "@/lib/server/domain/media/tv/tv.statistics";
import {createBooksStatistics} from "@/lib/server/domain/media/books/books.statistics";
import {createGamesStatistics} from "@/lib/server/domain/media/games/games.statistics";
import {createMangaStatistics} from "@/lib/server/domain/media/manga/manga.statistics";
import {createMoviesStatistics} from "@/lib/server/domain/media/movies/movies.statistics";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {mangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


export function setupMediaStatisticsModule() {
    return {
        registries: {
            mediaStatistics: createMediaRegistry({
                [MediaType.SERIES]: createTvStatistics(seriesServerDefinition),
                [MediaType.ANIME]: createTvStatistics(animeServerDefinition),
                [MediaType.MOVIES]: createMoviesStatistics(moviesServerDefinition),
                [MediaType.GAMES]: createGamesStatistics(gamesServerDefinition),
                [MediaType.BOOKS]: createBooksStatistics(booksServerDefinition),
                [MediaType.MANGA]: createMangaStatistics(mangaServerDefinition),
            }),
        },
    };
}
