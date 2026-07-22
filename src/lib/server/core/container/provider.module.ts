import {MediaModule} from "@/lib/server/core/container/media.module";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createJikanMangaProvider, createMangaIngestionService} from "@/lib/server/api-providers/jikan-manga.provider";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";


export function setupProviderModule(mediaModule: MediaModule, apiClientModule: ApiClientModule) {
    const apiClients = apiClientModule;

    const externalProviders = {
        series: createTmdbSeriesProvider(apiClients.tmdb),
        anime: createTmdbAnimeProvider(apiClients.tmdb),
        movies: createTmdbMoviesProvider(apiClients.tmdb),
        games: createIgdbGamesProvider(apiClients.igdb),
        books: createGBooksBooksProvider(apiClients.gBook),
        manga: createJikanMangaProvider(apiClients.jikan),
    };
    const externalProviderRegistry = createMediaRegistry(externalProviders);

    const ingestionServices = {
        series: createSeriesIngestionService(mediaModule.repositories.series, externalProviders.series),
        anime: createAnimeIngestionService(apiClients.jikan, mediaModule.repositories.anime, externalProviders.anime),
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
