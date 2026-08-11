import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {MediaServicesModule} from "@/lib/server/core/container/media-services.module";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createMalMangaProvider, createMangaIngestionService} from "@/lib/server/api-providers/mal-manga.provider";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";


type ProviderApiClients = Pick<ApiClientModule, "tmdb" | "igdb" | "mal" | "gBook" | "hltb">;


export function setupProviderModule(mediaModule: MediaServicesModule, apiClientModule: ProviderApiClients) {
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
