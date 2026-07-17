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
    const externalProviderRegistry = providerModule.externalProviders;
    const ingestionServiceRegistry = providerModule.ingestion;

    const importRepository = ImportRepository;
    const importService = new ImportService(importRepository);

    const matchersService = {
        series: createTvMatcher(
            MediaType.SERIES,
            providerModule.importCatalogs.series,
            externalProviderRegistry.get(MediaType.SERIES),
            ingestionServiceRegistry.get(MediaType.SERIES),
            mediaModule.library.commands[MediaType.SERIES],
        ),
        anime: createTvMatcher(
            MediaType.ANIME,
            providerModule.importCatalogs.anime,
            externalProviderRegistry.get(MediaType.ANIME),
            ingestionServiceRegistry.get(MediaType.ANIME),
            mediaModule.library.commands[MediaType.ANIME],
        ),
        movies: createMoviesMatcher(
            providerModule.importCatalogs.movies,
            externalProviderRegistry.get(MediaType.MOVIES),
            ingestionServiceRegistry.get(MediaType.MOVIES),
            mediaModule.library.commands[MediaType.MOVIES],
        ),
        games: createGamesMatcher(
            providerModule.importCatalogs.games,
            ingestionServiceRegistry.get(MediaType.GAMES),
            mediaModule.library.commands[MediaType.GAMES],
        ),
        books: createBooksMatcher(
            providerModule.importCatalogs.books,
            externalProviderRegistry.get(MediaType.BOOKS),
            ingestionServiceRegistry.get(MediaType.BOOKS),
            mediaModule.library.commands[MediaType.BOOKS],
        ),
        manga: createMangaMatcher(
            providerModule.importCatalogs.manga,
            externalProviderRegistry.get(MediaType.MANGA),
            ingestionServiceRegistry.get(MediaType.MANGA),
            mediaModule.library.commands[MediaType.MANGA],
        ),
    }
    Object.entries(matchersService).forEach(([key, service]) => {
        MediaMatcherRegistry.register(key as MediaType, service);
    });

    const importProcessor = new ImportJobProcessor(importService, MediaMatcherRegistry);

    return {
        jobs: importService,
        processor: importProcessor,
        matchers: MediaMatcherRegistry,
    };
}


export type ImportModule = ReturnType<typeof setupImportModule>;
