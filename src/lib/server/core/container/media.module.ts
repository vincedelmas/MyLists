import {MediaType} from "@/lib/utils/enums";
import {booksConfig} from "@/lib/server/domain/media/books/books.config";
import {gamesConfig} from "@/lib/server/domain/media/games/games.config";
import {mangaConfig} from "@/lib/server/domain/media/manga/manga.config";
import {moviesConfig} from "@/lib/server/domain/media/movies/movies.config";
import {BooksRepository, BooksService} from "@/lib/server/domain/media/books";
import {GamesRepository, GamesService} from "@/lib/server/domain/media/games";
import {MangaRepository, MangaService} from "@/lib/server/domain/media/manga";
import {MoviesRepository, MoviesService} from "@/lib/server/domain/media/movies";
import {createTvAchievementCatalog} from "@/lib/server/domain/media/tv/tv.achievements";
import {animeConfig, seriesConfig, TvRepository, TvService} from "@/lib/server/domain/media/tv";
import {createBooksAchievementCatalog} from "@/lib/server/domain/media/books/books.achievements";
import {createGamesAchievementCatalog} from "@/lib/server/domain/media/games/games.achievements";
import {createMangaAchievementCatalog} from "@/lib/server/domain/media/manga/manga.achievements";
import {createMoviesAchievementCatalog} from "@/lib/server/domain/media/movies/movies.achievements";
import {createMediaAchievementsRegistry, MediaRepositoryRegistry, MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";


export function setupMediaModule() {
    const repositories = {
        series: new TvRepository(seriesConfig),
        anime: new TvRepository(animeConfig),
        movies: new MoviesRepository(),
        games: new GamesRepository(),
        books: new BooksRepository(),
        manga: new MangaRepository(),
    };
    Object.entries(repositories).forEach(([key, repo]) => {
        MediaRepositoryRegistry.register(key as MediaType, repo);
    });

    const mediaAchievementsRegistry = createMediaAchievementsRegistry({
        [MediaType.SERIES]: createTvAchievementCatalog(seriesConfig),
        [MediaType.ANIME]: createTvAchievementCatalog(animeConfig),
        [MediaType.MOVIES]: createMoviesAchievementCatalog(moviesConfig),
        [MediaType.GAMES]: createGamesAchievementCatalog(gamesConfig),
        [MediaType.BOOKS]: createBooksAchievementCatalog(booksConfig),
        [MediaType.MANGA]: createMangaAchievementCatalog(mangaConfig),
    });

    const services = {
        series: new TvService(repositories.series),
        anime: new TvService(repositories.anime),
        movies: new MoviesService(repositories.movies),
        games: new GamesService(repositories.games),
        books: new BooksService(repositories.books),
        manga: new MangaService(repositories.manga),
    };
    Object.entries(services).forEach(([key, service]) => {
        MediaServiceRegistry.register(key as MediaType, service);
    })

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
            mediaService: MediaServiceRegistry,
            mediaRepository: MediaRepositoryRegistry,
            mediaAchievements: mediaAchievementsRegistry,
        }
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
