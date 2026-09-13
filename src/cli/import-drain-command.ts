import {spawnSync} from "node:child_process";
import {closeSync, openSync, realpathSync} from "node:fs";


export const runImportDrainCommand = async (databaseUrl: string) => {
    const lockFd = openSync(`${realpathSync(databaseUrl)}.import.lock`, "a", 0o600);

    try {
        // flock operates on a duplicate of our open file description. The lock
        // stays held by lockFd after flock exits, until we close it or this process dies.
        const lock = spawnSync("flock", ["--exclusive", "--nonblock", "--conflict-exit-code", "75", "3"], {
            stdio: ["ignore", "ignore", "pipe", lockFd],
        });
        if (lock.error) throw new Error("Could not run flock. Install util-linux to process imports.", { cause: lock.error });
        if (lock.status === 75) return { processedJobs: 0, failedJobs: 0 };
        if (lock.status !== 0) throw new Error(`Could not lock the import queue: ${lock.stderr?.toString().trim()}`);

        const [{getContainer}, {drainImportJobs}, {logger}] = await Promise.all([
            import("@/lib/server/core/container"),
            import("@/lib/server/domain/imports/import-drain"),
            import("@/lib/server/core/logger"),
        ]);
        const container = await getContainer();
        // Exclusive ownership proves that no previous processor is still running.
        container.services.importProcessor.requeueInterruptedJobs();
        const result = await drainImportJobs(container.services.importProcessor);

        logger.info({ processedJobs: result.processedJobs, failedJobs: result.failedJobs }, "Import drain finished");

        if (result.processedJobs > 0 || result.failedJobs > 0) {
            logger.info("Recomputing user stats after import drain");
            const {runTask} = await import("@/lib/server/tasks/task-runner");
            await runTask({
                input: {},
                triggeredBy: "cron/cli",
                taskName: "compute-all-users-stats",
            });
        }

        return result;
    }
    finally {
        closeSync(lockFd);
    }
};
