import {serverEnv} from "@/env/server";
import {MediaType} from "@/lib/utils/enums";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {TvMatcher} from "@/lib/server/domain/imports/matchers/tv.matcher";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {GamesMatcher} from "@/lib/server/domain/imports/matchers/games.matcher";
import {MoviesMatcher} from "@/lib/server/domain/imports/matchers/movies.matcher";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";
import {MediaProviderServiceRegistry, MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {NoopImportDrainStarter, SystemdImportDrainStarter} from "@/lib/server/domain/imports/import-drain.starter";


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

    const seriesProviderService = mediaProviderServiceRegistry.getService(MediaType.SERIES);
    const animeProviderService = mediaProviderServiceRegistry.getService(MediaType.ANIME);
    const moviesProviderService = mediaProviderServiceRegistry.getService(MediaType.MOVIES);
    const gamesProviderService = mediaProviderServiceRegistry.getService(MediaType.GAMES);

    importMatcherRegistry.register(MediaType.SERIES, TvMatcher.create(MediaType.SERIES, seriesService, seriesProviderService));
    importMatcherRegistry.register(MediaType.ANIME, TvMatcher.create(MediaType.ANIME, animeService, animeProviderService));
    importMatcherRegistry.register(MediaType.MOVIES, MoviesMatcher.create(moviesService, moviesProviderService));
    importMatcherRegistry.register(MediaType.GAMES, GamesMatcher.create(gamesService, gamesProviderService));

    const importProcessor = new ImportJobProcessor(importService, importMatcherRegistry);
    
    const importDrainStarter = serverEnv.IMPORT_DRAIN_AUTO_START
        ? new SystemdImportDrainStarter(serverEnv.IMPORT_DRAIN_SYSTEMD_SERVICE, serverEnv.IMPORT_DRAIN_SYSTEMD_USER)
        : new NoopImportDrainStarter();

    return {
        repositories: {
            imports: importRepository,
        },
        services: {
            importProcessor,
            importDrainStarter,
            imports: importService,
        },
        registries: {
            importMatcher: importMatcherRegistry,
        },
    };
}


export type ImportModule = ReturnType<typeof setupImportModule>;
