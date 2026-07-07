import {serverEnv} from "@/env/server";
import {MediaType} from "@/lib/utils/enums";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {MoviesMatcher} from "@/lib/server/domain/imports/matchers/movies.matcher";
import {ImportJobProcessor} from "@/lib/server/domain/imports/import-job.processor";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";
import {NoopImportDrainStarter, SystemdImportDrainStarter} from "@/lib/server/domain/imports/import-drain.starter";


export function setupImportModule(mediaServiceRegistry: typeof MediaServiceRegistry) {
    const importRepository = ImportRepository;
    const importService = new ImportService(importRepository);

    const importMatcherRegistry = new MediaMatcherRegistry();
    const moviesService = mediaServiceRegistry.getService(MediaType.MOVIES);
    importMatcherRegistry.register(MediaType.MOVIES, MoviesMatcher.create(moviesService));
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
