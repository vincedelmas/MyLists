import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {startWakeServer} from "@/worker/wake-server";
import {installProcessErrorHandlers} from "@/lib/server/core/process-errors";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";
import {runImportWorker} from "@/lib/server/domain/imports/import-worker";
import {createImportWorkerWakeSignal} from "@/lib/server/domain/imports/import-worker-wake";
import {setupImportWorkerModule} from "@/lib/server/core/container/import-worker.module";
import {computeAllUsersStats} from "@/lib/server/domain/user/compute-all-users-stats";

installProcessErrorHandlers();

const controller = new AbortController();
const wakeSignal = createImportWorkerWakeSignal();
let wakeServer: ReturnType<typeof startWakeServer> | undefined;
const requestShutdown = (signal: NodeJS.Signals) => {
    logger.info({signal}, "Import worker shutdown requested");
    controller.abort();
};

process.once("SIGINT", requestShutdown);
process.once("SIGTERM", requestShutdown);

try {
    const importWorkerModule = await setupImportWorkerModule();
    const processor = importWorkerModule.services.importProcessor;
    const mediaStatsRegistry = importWorkerModule.registries.mediaStatistics;

    wakeServer = startWakeServer({
        logger,
        onWake: wakeSignal.wake,
        hostname: serverEnv.IMPORT_WORKER_HOST,
        port: serverEnv.IMPORT_WORKER_PORT,
    });

    logger.info({
        pid: process.pid,
        fallbackIntervalMs: serverEnv.IMPORT_WORKER_FALLBACK_INTERVAL_MS,
        wakeUrl: wakeServer.url.href,
    }, "Import worker started");

    await runImportWorker({
        logger,
        signal: controller.signal,
        wakeSignal,
        fallbackIntervalMs: serverEnv.IMPORT_WORKER_FALLBACK_INTERVAL_MS,
        drain: () => drainImportJobs(processor, {signal: controller.signal}),
        refreshStats: () => computeAllUsersStats(mediaStatsRegistry),
    });

    logger.info({}, "Import worker stopped");
}
catch (error) {
    logger.fatal({err: error}, "Import worker failed to start");
    process.exitCode = 1;
}
finally {
    void wakeServer?.stop(true);
    process.removeListener("SIGINT", requestShutdown);
    process.removeListener("SIGTERM", requestShutdown);
}
