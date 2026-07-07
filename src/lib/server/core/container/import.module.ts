import {MediaType} from "@/lib/utils/enums";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {MoviesMatcher} from "@/lib/server/domain/imports/matchers/movies.matcher";
import {MediaMatcherRegistry} from "@/lib/server/domain/imports/matchers/media-matcher.registry";


export function setupImportModule(mediaServiceRegistry: typeof MediaServiceRegistry) {
    const importRepository = ImportRepository;
    const importService = new ImportService(importRepository);

    const importMatcherRegistry = new MediaMatcherRegistry();
    const moviesService = mediaServiceRegistry.getService(MediaType.MOVIES);
    importMatcherRegistry.register(MediaType.MOVIES, MoviesMatcher.create(moviesService));

    return {
        repositories: {
            imports: importRepository,
        },
        services: {
            imports: importService,
        },
        registries: {
            importMatcher: importMatcherRegistry,
        },
    };
}


export type ImportModule = ReturnType<typeof setupImportModule>;
