import {MediaType} from "@/lib/utils/enums";
import {MediaModule} from "@/lib/server/core/container/media.module";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {createGamesIngestionService, createIgdbGamesProvider} from "@/lib/server/api-providers/igdb-games.provider";
import {createJikanMangaProvider, createMangaIngestionService} from "@/lib/server/api-providers/jikan-manga.provider";
import {createMoviesIngestionService, createTmdbMoviesProvider} from "@/lib/server/api-providers/tmdb-movies.provider";
import {ExternalMediaProviderRegistry, MediaIngestionServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createAnimeIngestionService, createSeriesIngestionService, createTmdbAnimeProvider, createTmdbSeriesProvider} from "@/lib/server/api-providers/tmdb-tv.provider";


export function setupProviderModule(mediaModule: MediaModule, apiClientModule: ApiClientModule) {
    const apiClients = apiClientModule;
    const { definitions } = mediaModule;
    const tmdbIdentities = {
        [MediaType.SERIES]: definitions.series.identity,
        [MediaType.ANIME]: definitions.anime.identity,
        [MediaType.MOVIES]: definitions.movies.identity,
    };

    const externalProviders = {
        series: createTmdbSeriesProvider(apiClients.tmdb, definitions.series, tmdbIdentities),
        anime: createTmdbAnimeProvider(apiClients.tmdb, definitions.anime, tmdbIdentities),
        movies: createTmdbMoviesProvider(apiClients.tmdb, definitions.movies, tmdbIdentities),
        games: createIgdbGamesProvider(apiClients.igdb, definitions.games),
        books: createGBooksBooksProvider(apiClients.gBook, definitions.books),
        manga: createJikanMangaProvider(apiClients.jikan, definitions.manga),
    };
    Object.entries(externalProviders).forEach(([key, provider]) => {
        ExternalMediaProviderRegistry.register(key as MediaType, provider);
    });

    const ingestionServices = {
        series: createSeriesIngestionService(mediaModule.repositories.series, externalProviders.series),
        anime: createAnimeIngestionService(apiClients.jikan, mediaModule.repositories.anime, externalProviders.anime, definitions.anime),
        movies: createMoviesIngestionService(mediaModule.repositories.movies, externalProviders.movies),
        games: createGamesIngestionService(apiClients.hltb, mediaModule.repositories.games, externalProviders.games),
        books: createBooksIngestionService(mediaModule.repositories.books, externalProviders.books),
        manga: createMangaIngestionService(mediaModule.repositories.manga, externalProviders.manga),
    };
    Object.entries(ingestionServices).forEach(([key, service]) => {
        MediaIngestionServiceRegistry.register(key as MediaType, service);
    });

    return {
        registries: {
            externalProviders: ExternalMediaProviderRegistry,
            ingestionServices: MediaIngestionServiceRegistry,
        },
    }
}


export type ProviderModule = ReturnType<typeof setupProviderModule>;
