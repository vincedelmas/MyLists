import {logger} from "@/lib/server/core/logger";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";
import {setupImportWorkerModule} from "@/lib/server/core/container/import-worker.module";
import type {ImportWorkerModule} from "@/lib/server/core/container/import-worker.module";
import {computeAllUsersStats} from "@/lib/server/domain/user/compute-all-users-stats";


export const runImportDrainCommand = async (module?: ImportWorkerModule) => {
    const importWorkerModule = module ?? await setupImportWorkerModule();
    const result = await drainImportJobs(importWorkerModule.services.importProcessor);

    logger.info({ processedJobs: result.processedJobs, failedJobs: result.failedJobs }, "Import drain finished");

    if (result.processedJobs > 0 || result.failedJobs > 0) {
        logger.info("Recomputing user stats after import drain");

        await computeAllUsersStats(importWorkerModule.registries.mediaStatistics);
    }

    return result;
};
