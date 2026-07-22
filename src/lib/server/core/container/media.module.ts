import {MediaType} from "@/lib/utils/enums";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {booksDefinition} from "@/lib/server/domain/media/books/books.definition";
import {gamesDefinition} from "@/lib/server/domain/media/games/games.definition";
import {mangaDefinition} from "@/lib/server/domain/media/manga/manga.definition";
import {moviesDefinition} from "@/lib/server/domain/media/movies/movies.definition";
import {createTvAchievementCatalog} from "@/lib/server/domain/media/tv/tv.achievements";
import {createBooksAchievementCatalog} from "@/lib/server/domain/media/books/books.achievements";
import {createGamesAchievementCatalog} from "@/lib/server/domain/media/games/games.achievements";
import {createMangaAchievementCatalog} from "@/lib/server/domain/media/manga/manga.achievements";
import {createMoviesAchievementCatalog} from "@/lib/server/domain/media/movies/movies.achievements";
import {BooksRepository, BooksService, createBooksStatistics} from "@/lib/server/domain/media/books";
import {createGamesStatistics, GamesRepository, GamesService} from "@/lib/server/domain/media/games";
import {createMangaStatistics, MangaRepository, MangaService} from "@/lib/server/domain/media/manga";
import {createMoviesStatistics, MoviesRepository, MoviesService} from "@/lib/server/domain/media/movies";
import {animeDefinition, createTvStatistics, seriesDefinition, TvRepository, TvService} from "@/lib/server/domain/media/tv";


export function setupMediaModule() {
    const repositories = {
        series: new TvRepository(seriesDefinition),
        anime: new TvRepository(animeDefinition),
        movies: new MoviesRepository(moviesDefinition),
        games: new GamesRepository(gamesDefinition),
        books: new BooksRepository(booksDefinition),
        manga: new MangaRepository(mangaDefinition),
    };
    const mediaRepositoryRegistry = createMediaRegistry(repositories);

    const mediaAchievementsRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvAchievementCatalog(seriesDefinition),
        [MediaType.ANIME]: createTvAchievementCatalog(animeDefinition),
        [MediaType.MOVIES]: createMoviesAchievementCatalog(moviesDefinition),
        [MediaType.GAMES]: createGamesAchievementCatalog(gamesDefinition),
        [MediaType.BOOKS]: createBooksAchievementCatalog(booksDefinition),
        [MediaType.MANGA]: createMangaAchievementCatalog(mangaDefinition),
    });

    const services = {
        series: new TvService(repositories.series, seriesDefinition),
        anime: new TvService(repositories.anime, animeDefinition),
        movies: new MoviesService(repositories.movies, moviesDefinition),
        games: new GamesService(repositories.games, gamesDefinition),
        books: new BooksService(repositories.books, booksDefinition),
        manga: new MangaService(repositories.manga, mangaDefinition),
    };
    const mediaServiceRegistry = createMediaRegistry(services);

    const mediaStatRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvStatistics(seriesDefinition),
        [MediaType.ANIME]: createTvStatistics(animeDefinition),
        [MediaType.MOVIES]: createMoviesStatistics(moviesDefinition),
        [MediaType.GAMES]: createGamesStatistics(gamesDefinition),
        [MediaType.BOOKS]: createBooksStatistics(booksDefinition),
        [MediaType.MANGA]: createMangaStatistics(mangaDefinition),
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
