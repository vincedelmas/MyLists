import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {TvRepository} from "@/lib/server/domain/media/tv/tv.repository";
import {TvService} from "@/lib/server/domain/media/tv/tv.service";
import {BooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {BooksService} from "@/lib/server/domain/media/books/books.service";
import {GamesRepository} from "@/lib/server/domain/media/games/games.repository";
import {GamesService} from "@/lib/server/domain/media/games/games.service";
import {MangaRepository} from "@/lib/server/domain/media/manga/manga.repository";
import {MangaService} from "@/lib/server/domain/media/manga/manga.service";
import {MoviesRepository} from "@/lib/server/domain/media/movies/movies.repository";
import {MoviesService} from "@/lib/server/domain/media/movies/movies.service";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {mangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


export function setupMediaServicesModule() {
    const repositories = {
        series: new TvRepository(seriesServerDefinition),
        anime: new TvRepository(animeServerDefinition),
        movies: new MoviesRepository(moviesServerDefinition),
        games: new GamesRepository(gamesServerDefinition),
        books: new BooksRepository(booksServerDefinition),
        manga: new MangaRepository(mangaServerDefinition),
    };

    const services = {
        series: new TvService(repositories.series, seriesServerDefinition),
        anime: new TvService(repositories.anime, animeServerDefinition),
        movies: new MoviesService(repositories.movies, moviesServerDefinition),
        games: new GamesService(repositories.games, gamesServerDefinition),
        books: new BooksService(repositories.books, booksServerDefinition),
        manga: new MangaService(repositories.manga, mangaServerDefinition),
    };

    return {
        repositories,
        services,
        registries: {
            mediaService: createMediaRegistry(services),
            mediaRepository: createMediaRegistry(repositories),
        },
    };
}


export type MediaServicesModule = ReturnType<typeof setupMediaServicesModule>;
