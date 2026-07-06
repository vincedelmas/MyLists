import {ImportService} from "@/lib/server/domain/imports/import.service";
import {ImportRepository} from "@/lib/server/domain/imports/import.repository";


export function setupImportModule() {
    const importRepository = ImportRepository;
    const importService = new ImportService(importRepository);

    return {
        repositories: {
            imports: importRepository,
        },
        services: {
            imports: importService,
        },
    };
}


export type ImportModule = ReturnType<typeof setupImportModule>;
