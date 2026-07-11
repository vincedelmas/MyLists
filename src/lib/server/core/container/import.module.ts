import {MediaType} from "@/lib/utils/enums";
import {MediaModule} from "@/lib/server/core/container/media.module";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {ProviderModule} from "@/lib/server/core/container/provider.module";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {createTvMatcher} from "@/lib/server/domain/imports/matchers/tv.matcher";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {createGamesMatcher} from "@/lib/server/domain/imports/matchers/games.matcher";
import {createBooksMatcher} from "@/lib/server/domain/imports/matchers/books.matcher";
import {createMangaMatcher} from "@/lib/server/domain/imports/matchers/manga.matcher";
import {createMoviesMatcher} from "@/lib/server/domain/imports/matchers/movies.matcher";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";


export function setupImportModule(mediaModule: MediaModule, providerModule: ProviderModule) {
    const externalProviderRegistry = providerModule.registries.externalProviders;
    const ingestionServiceRegistry = providerModule.registries.ingestionServices;

    const importRepository = ImportRepository;
    const importService = new ImportService(importRepository);

    const matchersService = {
        series: createTvMatcher(
            MediaType.SERIES,
            mediaModule.services.series,
            externalProviderRegistry.get(MediaType.SERIES),
            ingestionServiceRegistry.get(MediaType.SERIES),
        ),
        anime: createTvMatcher(
            MediaType.ANIME,
            mediaModule.services.anime,
            externalProviderRegistry.get(MediaType.ANIME),
            ingestionServiceRegistry.get(MediaType.ANIME),
        ),
        movies: createMoviesMatcher(
            mediaModule.services.movies,
            externalProviderRegistry.get(MediaType.MOVIES),
            ingestionServiceRegistry.get(MediaType.MOVIES),
        ),
        games: createGamesMatcher(
            mediaModule.services.games,
            ingestionServiceRegistry.get(MediaType.GAMES),
        ),
        books: createBooksMatcher(
            mediaModule.services.books,
            externalProviderRegistry.get(MediaType.BOOKS),
            ingestionServiceRegistry.get(MediaType.BOOKS),
        ),
        manga: createMangaMatcher(
            mediaModule.services.manga,
            externalProviderRegistry.get(MediaType.MANGA),
            ingestionServiceRegistry.get(MediaType.MANGA),
        ),
    }
    Object.entries(matchersService).forEach(([key, service]) => {
        MediaMatcherRegistry.register(key as MediaType, service);
    });

    const importProcessor = new ImportJobProcessor(importService, MediaMatcherRegistry);

    return {
        repositories: {
            imports: importRepository,
        },
        services: {
            importProcessor,
            imports: importService,
        },
        registries: {
            importMatcher: MediaMatcherRegistry,
        },
    };
}


export type ImportModule = ReturnType<typeof setupImportModule>;
