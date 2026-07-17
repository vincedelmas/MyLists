import {MediaType} from "@/lib/utils/enums";
import {MediaModuleRegistry} from "@/lib/server/core/container/media/media-module.registry";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {ImportJobProcessor, MediaMatcherSource} from "@/lib/server/domain/imports/import-job.processor";


export function setupImportModule(mediaRegistry: MediaModuleRegistry) {
    const jobs = new ImportService(ImportRepository);
    const matchers: MediaMatcherSource = {
        get(mediaType: MediaType) {
            return mediaRegistry.get(mediaType).imports.matcher;
        },
    };

    return {
        jobs,
        processor: new ImportJobProcessor(jobs, matchers),
    };
}


export type ImportModule = ReturnType<typeof setupImportModule>;
