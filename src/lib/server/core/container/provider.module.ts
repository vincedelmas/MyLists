import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createJikanMangaProvider, createMangaIngestionService} from "@/lib/server/api-providers/jikan-manga.provider";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {ExternalMediaProviderRegistry, MediaIngestionServiceRegistry} from "@/lib/server/api-providers/media-provider.registries";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.repository";
import {MovieCatalogIngestionRepository} from "@/lib/server/domain/catalog/movies/movie-catalog-ingestion.repository";
import {GameCatalogIngestionRepository} from "@/lib/server/domain/catalog/games/game-catalog-ingestion.repository";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.repository";
import {MangaCatalogIngestionRepository} from "@/lib/server/domain/catalog/manga/manga-catalog-ingestion.repository";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";


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
    const movieCatalog = new MovieCatalogIngestionRepository();
    const gameCatalog = new GameCatalogIngestionRepository();
    const bookCatalog = new BookCatalogIngestionRepository();
    const mangaCatalog = new MangaCatalogIngestionRepository();
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
            seriesCatalog,
            externalProviders.series,
            refreshSources.series,
        ),
        anime: createAnimeIngestionService(
            apiClients.jikan,
            animeCatalog,
            externalProviders.anime,
            refreshSources.anime,
        ),
        movies: createMoviesIngestionService(
            movieCatalog,
            externalProviders.movies,
            refreshSources.movies,
        ),
        games: createGamesIngestionService(
            apiClients.hltb,
            gameCatalog,
            externalProviders.games,
            refreshSources.games,
        ),
        books: createBooksIngestionService(
            bookCatalog,
            externalProviders.books,
        ),
        manga: createMangaIngestionService(
            mangaCatalog,
            externalProviders.manga,
            refreshSources.manga,
        ),
    };
    Object.entries(ingestionServices).forEach(([key, service]) => {
        MediaIngestionServiceRegistry.register(key as MediaType, service);
    });

    return {
        registries: {
            externalProviders: ExternalMediaProviderRegistry,
            ingestionServices: MediaIngestionServiceRegistry,
        },
        features: {
            refreshCandidates,
            catalogs: {
                series: seriesCatalog,
                anime: animeCatalog,
                movies: movieCatalog,
                games: gameCatalog,
                books: bookCatalog,
                manga: mangaCatalog,
            },
        },
    }
}


export type ProviderModule = ReturnType<typeof setupProviderModule>;
