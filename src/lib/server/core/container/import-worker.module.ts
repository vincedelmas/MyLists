import {setupImportModule} from "@/lib/server/core/container/import.module";
import {setupProviderModule} from "@/lib/server/core/container/provider.module";
import {setupMediaServicesModule} from "@/lib/server/core/container/media-services.module";
import {setupMediaStatisticsModule} from "@/lib/server/core/container/media-statistics.module";
import {setupImportApiClientsModule} from "@/lib/server/core/container/import-api-client.module";


export const setupImportWorkerModule = async () => {
    const apiClientModule = await setupImportApiClientsModule();
    const mediaServicesModule = setupMediaServicesModule();
    const mediaStatisticsModule = setupMediaStatisticsModule();
    const providerModule = setupProviderModule(mediaServicesModule, apiClientModule);
    const importModule = setupImportModule(mediaServicesModule, providerModule);

    return {
        services: {
            importProcessor: importModule.services.importProcessor,
        },
        registries: {
            mediaStatistics: mediaStatisticsModule.registries.mediaStatistics,
        },
    };
};


export type ImportWorkerModule = Awaited<ReturnType<typeof setupImportWorkerModule>>;
