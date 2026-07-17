import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createJikanMangaProvider, createMangaIngestionService} from "@/lib/server/api-providers/jikan-manga.provider";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {ExternalMediaProviderRegistry, MediaIngestionServiceRegistry} from "@/lib/server/api-providers/media-provider.registries";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.repository";
import {TvCatalogIngestionCommand} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.command";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-ingestion.repository";
import {MovieCatalogIngestionCommand} from "@/lib/server/domain/catalog/movies/movie-catalog-ingestion.command";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/catalog/games/game-catalog-ingestion.repository";
import {GameCatalogIngestionCommand} from "@/lib/server/domain/catalog/games/game-catalog-ingestion.command";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.repository";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.repository";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {BookCatalogIngestionCommand} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.command";
import {MangaCatalogIngestionCommand} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.command";


export function setupProviderModule(apiClientModule: ApiClientModule) {
    const apiClients = apiClientModule;

    const externalProviders = {
        series: createTmdbSeriesProvider(apiClients.tmdb),
        anime: createTmdbAnimeProvider(apiClients.tmdb),
        movies: createTmdbMoviesProvider(apiClients.tmdb),
        games: createIgdbGamesProvider(apiClients.igdb),
        books: createGBooksBooksProvider(apiClients.gBook),
        manga: createJikanMangaProvider(apiClients.jikan),
    };
    Object.entries(externalProviders).forEach(([key, provider]) => {
        ExternalMediaProviderRegistry.register(key as MediaType, provider);
    });

    const seriesCatalog = new TvCatalogIngestionRepository(MediaType.SERIES);
    const animeCatalog = new TvCatalogIngestionRepository(MediaType.ANIME);
    const seriesCatalogCommands = new TvCatalogIngestionCommand(seriesCatalog);
    const animeCatalogCommands = new TvCatalogIngestionCommand(animeCatalog);
    const movieCatalog = new MovieCatalogIngestionRepository();
    const movieCatalogCommands = new MovieCatalogIngestionCommand(movieCatalog);
    const gameCatalog = new GameCatalogIngestionRepository();
    const gameCatalogCommands = new GameCatalogIngestionCommand(gameCatalog);
    const bookCatalog = new BookCatalogIngestionRepository();
    const bookCatalogCommands = new BookCatalogIngestionCommand(bookCatalog);
    const mangaCatalog = new MangaCatalogIngestionRepository();
    const mangaCatalogCommands = new MangaCatalogIngestionCommand(mangaCatalog);
    const refreshCandidates = new CatalogRefreshCandidateRepository();
    const refreshSources = {
        series: {
            async getCandidateApiIds() {
                const changedIds = await externalProviders.series.changedIds?.getChangedIds() ?? [];
                return refreshCandidates.getTvCandidateApiIds(MediaType.SERIES, changedIds);
            },
        },
        anime: {
            async getCandidateApiIds() {
                const changedIds = await externalProviders.anime.changedIds?.getChangedIds() ?? [];
                return refreshCandidates.getTvCandidateApiIds(MediaType.ANIME, changedIds);
            },
        },
        movies: { getCandidateApiIds: () => refreshCandidates.getMovieCandidateApiIds() },
        games: { getCandidateApiIds: () => refreshCandidates.getGameCandidateApiIds() },
        manga: { getCandidateApiIds: () => refreshCandidates.getMangaCandidateApiIds() },
    };

    const ingestionServices = {
        series: createSeriesIngestionService(
            seriesCatalogCommands,
            externalProviders.series,
            refreshSources.series,
        ),
        anime: createAnimeIngestionService(
            apiClients.jikan,
            animeCatalogCommands,
            externalProviders.anime,
            refreshSources.anime,
        ),
        movies: createMoviesIngestionService(
            movieCatalogCommands,
            externalProviders.movies,
            refreshSources.movies,
        ),
        games: createGamesIngestionService(
            apiClients.hltb,
            gameCatalogCommands,
            externalProviders.games,
            refreshSources.games,
        ),
        books: createBooksIngestionService(
            bookCatalogCommands,
            externalProviders.books,
        ),
        manga: createMangaIngestionService(
            mangaCatalogCommands,
            externalProviders.manga,
            refreshSources.manga,
        ),
    };
    Object.entries(ingestionServices).forEach(([key, service]) => {
        MediaIngestionServiceRegistry.register(key as MediaType, service);
    });

    return {
        externalProviders: ExternalMediaProviderRegistry,
        ingestion: MediaIngestionServiceRegistry,
        importCatalogs: {
            series: seriesCatalog,
            anime: animeCatalog,
            movies: movieCatalog,
            games: gameCatalog,
            books: bookCatalog,
            manga: mangaCatalog,
        },
    }
}


export type ProviderModule = ReturnType<typeof setupProviderModule>;
