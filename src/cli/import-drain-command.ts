import {runTask} from "@/lib/server/tasks/task-runner";
import {getContainer} from "@/lib/server/core/container";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";


export const runImportDrainCommand = async () => {
    const container = await getContainer();
    const result = await drainImportJobs(container.services.importProcessor);

    console.log(`Import drain finished. Processed jobs: ${result.processedJobs}. Failed jobs: ${result.failedJobs}`);

    if (result.processedJobs > 0 || result.failedJobs > 0) {
        console.log("Recomputing user stats after import drain.");
        await runTask({
            input: {},
            triggeredBy: "cron/cli",
            taskName: "compute-all-users-stats",
        });
    }

    return result;
};
