import {MediaType} from "@/lib/utils/enums";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {TvMatcher} from "@/lib/server/domain/imports/matchers/tv.matcher";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {GamesMatcher} from "@/lib/server/domain/imports/matchers/games.matcher";
import {BooksMatcher} from "@/lib/server/domain/imports/matchers/books.matcher";
import {MangaMatcher} from "@/lib/server/domain/imports/matchers/manga.matcher";
import {MoviesMatcher} from "@/lib/server/domain/imports/matchers/movies.matcher";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";
import {MediaProviderServiceRegistry, MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";


export function setupImportModule(
    mediaServiceRegistry: typeof MediaServiceRegistry,
    mediaProviderServiceRegistry: typeof MediaProviderServiceRegistry,
) {
    const importRepository = ImportRepository;
    const importService = new ImportService(importRepository);

    const importMatcherRegistry = new MediaMatcherRegistry();

    const seriesService = mediaServiceRegistry.getService(MediaType.SERIES);
    const animeService = mediaServiceRegistry.getService(MediaType.ANIME);
    const moviesService = mediaServiceRegistry.getService(MediaType.MOVIES);
    const gamesService = mediaServiceRegistry.getService(MediaType.GAMES);
    const booksService = mediaServiceRegistry.getService(MediaType.BOOKS);
    const mangaService = mediaServiceRegistry.getService(MediaType.MANGA);

    const seriesProviderService = mediaProviderServiceRegistry.getService(MediaType.SERIES);
    const animeProviderService = mediaProviderServiceRegistry.getService(MediaType.ANIME);
    const moviesProviderService = mediaProviderServiceRegistry.getService(MediaType.MOVIES);
    const gamesProviderService = mediaProviderServiceRegistry.getService(MediaType.GAMES);
    const booksProviderService = mediaProviderServiceRegistry.getService(MediaType.BOOKS);
    const mangaProviderService = mediaProviderServiceRegistry.getService(MediaType.MANGA);

    importMatcherRegistry.register(MediaType.SERIES, TvMatcher.create(MediaType.SERIES, seriesService, seriesProviderService));
    importMatcherRegistry.register(MediaType.ANIME, TvMatcher.create(MediaType.ANIME, animeService, animeProviderService));
    importMatcherRegistry.register(MediaType.MOVIES, MoviesMatcher.create(moviesService, moviesProviderService));
    importMatcherRegistry.register(MediaType.GAMES, GamesMatcher.create(gamesService, gamesProviderService));
    importMatcherRegistry.register(MediaType.BOOKS, BooksMatcher.create(booksService, booksProviderService));
    importMatcherRegistry.register(MediaType.MANGA, MangaMatcher.create(mangaService, mangaProviderService));

    const importProcessor = new ImportJobProcessor(importService, importMatcherRegistry);

    return {
        repositories: {
            imports: importRepository,
        },
        services: {
            importProcessor,
            imports: importService,
        },
        registries: {
            importMatcher: importMatcherRegistry,
        },
    };
}


export type ImportModule = ReturnType<typeof setupImportModule>;
