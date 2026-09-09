import {MediaType} from "@/lib/utils/enums";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {createTvAchievementCatalog} from "@/lib/server/domain/media/tv/tv.achievements";
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
import {createTvMonthlyActivity, createTvStatistics, createTvRepository, createTvService} from "@/lib/server/domain/media/tv";
import {createBooksRepository, createBooksService, createBooksMonthlyActivity, createBooksStatistics} from "@/lib/server/domain/media/books";
import {createGamesMonthlyActivity, createGamesStatistics, createGamesRepository, createGamesService} from "@/lib/server/domain/media/games";
import {createMangaMonthlyActivity, createMangaStatistics, createMangaRepository, createMangaService} from "@/lib/server/domain/media/manga";
import {createMoviesMonthlyActivity, createMoviesStatistics, createMoviesRepository, createMoviesService} from "@/lib/server/domain/media/movies";


export function setupMediaModule() {
    const repositories = {
        series: createTvRepository(seriesServerDefinition),
        anime: createTvRepository(animeServerDefinition),
        movies: createMoviesRepository(moviesServerDefinition),
        games: createGamesRepository(gamesServerDefinition),
        books: createBooksRepository(booksServerDefinition),
        manga: createMangaRepository(mangaServerDefinition),
    };
    const mediaRepositoryRegistry = createMediaRegistry(repositories);

    const mediaMonthlyActivityRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvMonthlyActivity(seriesServerDefinition, repositories.series),
        [MediaType.ANIME]: createTvMonthlyActivity(animeServerDefinition, repositories.anime),
        [MediaType.MOVIES]: createMoviesMonthlyActivity(moviesServerDefinition, repositories.movies),
        [MediaType.GAMES]: createGamesMonthlyActivity(gamesServerDefinition, repositories.games),
        [MediaType.BOOKS]: createBooksMonthlyActivity(booksServerDefinition, repositories.books),
        [MediaType.MANGA]: createMangaMonthlyActivity(mangaServerDefinition, repositories.manga),
    });

    const mediaAchievementsRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvAchievementCatalog(seriesServerDefinition),
        [MediaType.ANIME]: createTvAchievementCatalog(animeServerDefinition),
        [MediaType.MOVIES]: createMoviesAchievementCatalog(moviesServerDefinition),
        [MediaType.GAMES]: createGamesAchievementCatalog(gamesServerDefinition),
        [MediaType.BOOKS]: createBooksAchievementCatalog(booksServerDefinition),
        [MediaType.MANGA]: createMangaAchievementCatalog(mangaServerDefinition),
    });

    const services = {
        series: createTvService(repositories.series, seriesServerDefinition),
        anime: createTvService(repositories.anime, animeServerDefinition),
        movies: createMoviesService(repositories.movies, moviesServerDefinition),
        games: createGamesService(repositories.games, gamesServerDefinition),
        books: createBooksService(repositories.books, booksServerDefinition),
        manga: createMangaService(repositories.manga, mangaServerDefinition),
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
            mediaMonthlyActivity: mediaMonthlyActivityRegistry,
        }
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
