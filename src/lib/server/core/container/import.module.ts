import {MediaType} from "@/lib/utils/enums";
import {MediaModuleRegistry} from "@/lib/server/domain/media/media-module.registry";
import {ImportService} from "@/lib/server/domain/imports/import.service";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";
import {ImportJobProcessor, MediaMatcherSource} from "@/lib/server/domain/imports/import-job.processor";
import {ImportSource} from "@/lib/utils/enums";
import {createMyListsCsvParser} from "@/lib/server/domain/imports/parsers/mylists.parser";


export function setupImportModule(mediaRegistry: MediaModuleRegistry) {
    const jobs = new ImportService(ImportRepository, {
        [ImportSource.MYLISTS]: createMyListsCsvParser({
            get(kind: MediaType) {
                return mediaRegistry.get(kind).imports.csv.rowSchema;
            },
        }),
    });
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
