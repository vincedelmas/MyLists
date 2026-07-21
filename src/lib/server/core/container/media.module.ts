import {MediaType} from "@/lib/utils/enums";
import {BooksRepository, BooksService} from "@/lib/server/domain/media/books";
import {GamesRepository, GamesService} from "@/lib/server/domain/media/games";
import {MangaRepository, MangaService} from "@/lib/server/domain/media/manga";
import {booksDefinition} from "@/lib/server/domain/media/books/books.definition";
import {gamesDefinition} from "@/lib/server/domain/media/games/games.definition";
import {mangaDefinition} from "@/lib/server/domain/media/manga/manga.definition";
import {MoviesRepository, MoviesService} from "@/lib/server/domain/media/movies";
import {moviesDefinition} from "@/lib/server/domain/media/movies/movies.definition";
import {createTvAchievementCatalog} from "@/lib/server/domain/media/tv/tv.achievements";
import {createBooksAchievementCatalog} from "@/lib/server/domain/media/books/books.achievements";
import {createGamesAchievementCatalog} from "@/lib/server/domain/media/games/games.achievements";
import {createMangaAchievementCatalog} from "@/lib/server/domain/media/manga/manga.achievements";
import {createMoviesAchievementCatalog} from "@/lib/server/domain/media/movies/movies.achievements";
import {animeDefinition, seriesDefinition, TvRepository, TvService} from "@/lib/server/domain/media/tv";
import {createMediaAchievementsRegistry, MediaRepositoryRegistry, MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";


export function setupMediaModule() {
    const repositories = {
        series: new TvRepository(seriesDefinition.repository, seriesDefinition.attribution),
        anime: new TvRepository(animeDefinition.repository, animeDefinition.attribution),
        movies: new MoviesRepository(moviesDefinition.repository, moviesDefinition.attribution),
        games: new GamesRepository(gamesDefinition.repository, gamesDefinition.attribution),
        books: new BooksRepository(booksDefinition.repository, booksDefinition.attribution),
        manga: new MangaRepository(mangaDefinition.repository, mangaDefinition.attribution),
    };
    Object.entries(repositories).forEach(([key, repo]) => {
        MediaRepositoryRegistry.register(key as MediaType, repo);
    });

    const mediaAchievementsRegistry = createMediaAchievementsRegistry({
        [MediaType.SERIES]: createTvAchievementCatalog(seriesDefinition.repository),
        [MediaType.ANIME]: createTvAchievementCatalog(animeDefinition.repository),
        [MediaType.MOVIES]: createMoviesAchievementCatalog(moviesDefinition.repository),
        [MediaType.GAMES]: createGamesAchievementCatalog(gamesDefinition.repository),
        [MediaType.BOOKS]: createBooksAchievementCatalog(booksDefinition.repository),
        [MediaType.MANGA]: createMangaAchievementCatalog(mangaDefinition.repository),
    });

    const services = {
        series: new TvService(repositories.series, seriesDefinition.service),
        anime: new TvService(repositories.anime, animeDefinition.service),
        movies: new MoviesService(repositories.movies, moviesDefinition.service),
        games: new GamesService(repositories.games, gamesDefinition.service),
        books: new BooksService(repositories.books, booksDefinition.service),
        manga: new MangaService(repositories.manga, mangaDefinition.service),
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
