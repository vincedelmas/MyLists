import {runTask} from "@/lib/server/tasks/task-runner";
import {getContainer} from "@/lib/server/core/container";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";


export const runImportDrainCommand = async () => {
    const container = await getContainer();
    const result = await drainImportJobs(container.services.importProcessor);

    console.log(`Import drain finished. Processed jobs: ${result.processedJobs}`);

    if (result.processedJobs > 0) {
        console.log("Recomputing user stats after import drain.");
        await runTask({ input: {}, taskName: "compute-all-users-stats", triggeredBy: "cron/cli" });
    }

    return result;
};
