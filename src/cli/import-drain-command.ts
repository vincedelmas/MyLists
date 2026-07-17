import {logger} from "@/lib/server/core/logger";
import {runTask} from "@/lib/server/tasks/task-runner";
import {getContainer} from "@/lib/server/core/container";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";


export const runImportDrainCommand = async () => {
    const container = await getContainer();
    const result = await drainImportJobs(container.imports.processor);

    logger.info({ processedJobs: result.processedJobs, failedJobs: result.failedJobs }, "Import drain finished");

    if (result.processedJobs > 0 || result.failedJobs > 0) {
        logger.info("Recomputing user stats after import drain");

        await runTask({
            input: {},
            triggeredBy: "cron/cli",
            taskName: "compute-all-users-stats",
        });
    }

    return result;
};
