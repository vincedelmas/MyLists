import {MediaType} from "@/lib/utils/enums";
import {BooksRepository, BooksService} from "@/lib/server/domain/media/books";
import {GamesRepository, GamesService} from "@/lib/server/domain/media/games";
import {MangaRepository, MangaService} from "@/lib/server/domain/media/manga";
import {MoviesRepository, MoviesService} from "@/lib/server/domain/media/movies";
import {animeConfig, seriesConfig, TvRepository, TvService} from "@/lib/server/domain/media/tv";
import {booksConfig} from "@/lib/server/domain/media/books/books.config";
import {gamesConfig} from "@/lib/server/domain/media/games/games.config";
import {mangaConfig} from "@/lib/server/domain/media/manga/manga.config";
import {moviesConfig} from "@/lib/server/domain/media/movies/movies.config";
import {createMediaAchievements} from "@/lib/server/domain/media/media-achievements.factory";
import {
    MediaAchievementsRegistry,
    MediaRepositoryRegistry,
    MediaServiceRegistry,
} from "@/lib/server/domain/media/media.registries";


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

    const achievements = {
        series: createMediaAchievements(seriesConfig),
        anime: createMediaAchievements(animeConfig),
        movies: createMediaAchievements(moviesConfig),
        games: createMediaAchievements(gamesConfig),
        books: createMediaAchievements(booksConfig),
        manga: createMediaAchievements(mangaConfig),
    };
    Object.entries(achievements).forEach(([key, calculator]) => {
        MediaAchievementsRegistry.register(key as MediaType, calculator);
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
            mediaAchievements: MediaAchievementsRegistry,
            mediaService: MediaServiceRegistry,
            mediaRepository: MediaRepositoryRegistry,
        }
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
