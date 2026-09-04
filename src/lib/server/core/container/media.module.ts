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
import {createWcfCatalogRegistry, defineWcfCatalog} from "@/lib/server/domain/which-came-first/wcf-catalog";
import {defineTasteSimilarityCatalog} from "@/lib/server/domain/social/taste-similarity-catalog";
import {createTvMonthlyActivity, createTvStatistics, TvRepository, TvService} from "@/lib/server/domain/media/tv";
import {createMediadleCatalogRegistry, defineMediadleCatalog} from "@/lib/server/domain/mediadle/mediadle-catalog";
import {BooksRepository, BooksService, createBooksMonthlyActivity, createBooksStatistics} from "@/lib/server/domain/media/books";
import {createGamesMonthlyActivity, createGamesStatistics, GamesRepository, GamesService} from "@/lib/server/domain/media/games";
import {createMangaMonthlyActivity, createMangaStatistics, MangaRepository, MangaService} from "@/lib/server/domain/media/manga";
import {createMoviesMonthlyActivity, createMoviesStatistics, MoviesRepository, MoviesService} from "@/lib/server/domain/media/movies";


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

    const tasteSimilarityCatalogRegistry = createMediaRegistry({
        [MediaType.SERIES]: defineTasteSimilarityCatalog(seriesServerDefinition),
        [MediaType.ANIME]: defineTasteSimilarityCatalog(animeServerDefinition),
        [MediaType.MOVIES]: defineTasteSimilarityCatalog(moviesServerDefinition),
        [MediaType.GAMES]: defineTasteSimilarityCatalog(gamesServerDefinition),
        [MediaType.BOOKS]: defineTasteSimilarityCatalog(booksServerDefinition),
        [MediaType.MANGA]: defineTasteSimilarityCatalog(mangaServerDefinition),
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

    const mediadleCatalogRegistry = createMediadleCatalogRegistry({
        [MediaType.MOVIES]: defineMediadleCatalog({ mediaService: services.movies, mediaType: moviesServerDefinition.identity.mediaType }),
    });

    const wcfCatalogRegistry = createWcfCatalogRegistry({
        [MediaType.SERIES]: defineWcfCatalog({ mediaService: services.series, mediaType: seriesServerDefinition.identity.mediaType }),
        [MediaType.ANIME]: defineWcfCatalog({ mediaService: services.anime, mediaType: animeServerDefinition.identity.mediaType }),
        [MediaType.MOVIES]: defineWcfCatalog({ mediaService: services.movies, mediaType: moviesServerDefinition.identity.mediaType }),
        [MediaType.GAMES]: defineWcfCatalog({ mediaService: services.games, mediaType: gamesServerDefinition.identity.mediaType }),
        [MediaType.MANGA]: defineWcfCatalog({ mediaService: services.manga, mediaType: mangaServerDefinition.identity.mediaType }),
    });

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
            tasteSimilarityCatalog: tasteSimilarityCatalogRegistry,
            mediadleCatalog: mediadleCatalogRegistry,
            wcfCatalog: wcfCatalogRegistry,
            mediaMonthlyActivity: mediaMonthlyActivityRegistry,
        }
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
