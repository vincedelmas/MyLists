import {MediaType} from "@/lib/utils/enums";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {createTvAchievementCatalog} from "@/lib/server/domain/media/tv/tv.achievements";
import {createTvStatistics, TvRepository, TvService} from "@/lib/server/domain/media/tv";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {mangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {createBooksAchievementCatalog} from "@/lib/server/domain/media/books/books.achievements";
import {createGamesAchievementCatalog} from "@/lib/server/domain/media/games/games.achievements";
import {createMangaAchievementCatalog} from "@/lib/server/domain/media/manga/manga.achievements";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {createMoviesAchievementCatalog} from "@/lib/server/domain/media/movies/movies.achievements";
import {BooksRepository, BooksService, createBooksStatistics} from "@/lib/server/domain/media/books";
import {createGamesStatistics, GamesRepository, GamesService} from "@/lib/server/domain/media/games";
import {createMangaStatistics, MangaRepository, MangaService} from "@/lib/server/domain/media/manga";
import {createMoviesStatistics, MoviesRepository, MoviesService} from "@/lib/server/domain/media/movies";


export function setupMediaModule() {
    const repositories = {
        series: new TvRepository(seriesServerDefinition),
        anime: new TvRepository(animeServerDefinition),
        movies: new MoviesRepository(moviesServerDefinition),
        games: new GamesRepository(gamesServerDefinition),
        books: new BooksRepository(booksServerDefinition),
        manga: new MangaRepository(mangaServerDefinition),
    };
    const mediaRepositoryRegistry = createMediaRegistry(repositories);

    const mediaAchievementsRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvAchievementCatalog(seriesServerDefinition),
        [MediaType.ANIME]: createTvAchievementCatalog(animeServerDefinition),
        [MediaType.MOVIES]: createMoviesAchievementCatalog(moviesServerDefinition),
        [MediaType.GAMES]: createGamesAchievementCatalog(gamesServerDefinition),
        [MediaType.BOOKS]: createBooksAchievementCatalog(booksServerDefinition),
        [MediaType.MANGA]: createMangaAchievementCatalog(mangaServerDefinition),
    });

    const services = {
        series: new TvService(repositories.series, seriesServerDefinition),
        anime: new TvService(repositories.anime, animeServerDefinition),
        movies: new MoviesService(repositories.movies, moviesServerDefinition),
        games: new GamesService(repositories.games, gamesServerDefinition),
        books: new BooksService(repositories.books, booksServerDefinition),
        manga: new MangaService(repositories.manga, mangaServerDefinition),
    };
    const mediaServiceRegistry = createMediaRegistry(services);

    const mediaStatRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvStatistics(seriesServerDefinition),
        [MediaType.ANIME]: createTvStatistics(animeServerDefinition),
        [MediaType.MOVIES]: createMoviesStatistics(moviesServerDefinition),
        [MediaType.GAMES]: createGamesStatistics(gamesServerDefinition),
        [MediaType.BOOKS]: createBooksStatistics(booksServerDefinition),
        [MediaType.MANGA]: createMangaStatistics(mangaServerDefinition),
    });

    return {
        repositories: {
            series: repositories.series,
            anime: repositories.anime,
            movies: repositories.movies,
            games: repositories.games,
            books: repositories.books,
            manga: repositories.manga,
        },
        services: {
            series: services.series,
            anime: services.anime,
            movies: services.movies,
            games: services.games,
            books: services.books,
            manga: services.manga,
        },
        registries: {
            mediaService: mediaServiceRegistry,
            mediaStatistics: mediaStatRegistry,
            mediaRepository: mediaRepositoryRegistry,
            mediaAchievements: mediaAchievementsRegistry,
        }
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
