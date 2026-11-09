import type {MediaModule} from "@/lib/server/core/container/media.module";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {createMalMangaProvider, createMangaIngestionService} from "@/lib/server/api-providers/mal-manga.provider";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createGBooksApi, createHltbApi, createIgdbApi, createLlmApi, createMalApi, createTmdbApi} from "@/lib/server/api-providers/api";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";


export const setupApiClientsModule = async () => {
    const [hltbClient, igdbClient, tmdbClient, malClient, gBookClient, llmClient] = await Promise.all([
        createHltbApi(),
        createIgdbApi(),
        createTmdbApi(),
        createMalApi(),
        createGBooksApi(),
        createLlmApi(),
    ]);

    return {
        mal: malClient,
        igdb: igdbClient,
        hltb: hltbClient,
        tmdb: tmdbClient,
        gBook: gBookClient,
        llmClient: llmClient,
    };
};


export type ApiClientModule = Awaited<ReturnType<typeof setupApiClientsModule>>;


export function setupProviderModule(mediaModule: MediaModule, apiClientModule: ApiClientModule) {
    const apiClients = apiClientModule;

    const externalProviders = {
        series: createTmdbSeriesProvider(apiClients.tmdb),
        anime: createTmdbAnimeProvider(apiClients.tmdb),
        movies: createTmdbMoviesProvider(apiClients.tmdb),
        games: createIgdbGamesProvider(apiClients.igdb),
        books: createGBooksBooksProvider(apiClients.gBook),
        manga: createMalMangaProvider(apiClients.mal),
    };
    const externalProviderRegistry = createMediaRegistry(externalProviders);

    const ingestionServices = {
        series: createSeriesIngestionService(mediaModule.repositories.series, externalProviders.series),
        anime: createAnimeIngestionService(apiClients.mal, mediaModule.repositories.anime, externalProviders.anime),
        movies: createMoviesIngestionService(mediaModule.repositories.movies, externalProviders.movies),
        games: createGamesIngestionService(apiClients.hltb, mediaModule.repositories.games, externalProviders.games),
        books: createBooksIngestionService(mediaModule.repositories.books, externalProviders.books),
        manga: createMangaIngestionService(mediaModule.repositories.manga, externalProviders.manga),
    };
    const ingestionServiceRegistry = createMediaRegistry(ingestionServices);

    return {
        registries: {
            externalProviders: externalProviderRegistry,
            ingestionServices: ingestionServiceRegistry,
        },
    }
}


export type ProviderModule = ReturnType<typeof setupProviderModule>;
