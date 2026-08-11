import {ImportDrainResult} from "@/lib/server/domain/imports/import-drain";
import {ImportWorkerWakeSignal} from "@/lib/server/domain/imports/import-worker-wake";


type ImportWorkerLogger = {
    error: (details: object, message: string) => void;
    info: (details: object, message: string) => void;
};


type RunImportWorkerOptions = {
    drain: () => Promise<ImportDrainResult>;
    fallbackIntervalMs: number;
    logger: ImportWorkerLogger;
    refreshStats: () => Promise<void>;
    signal: AbortSignal;
    wakeSignal: Pick<ImportWorkerWakeSignal, "wait">;
};


export const runImportWorker = async ({
    drain,
    fallbackIntervalMs,
    logger,
    refreshStats,
    signal,
    wakeSignal,
}: RunImportWorkerOptions) => {
    let statsRefreshPending = false;

    while (!signal.aborted) {
        try {
            const result = await drain();

            if (result.processedJobs > 0 || result.failedJobs > 0) {
                statsRefreshPending = true;
                logger.info(result, "Import worker drain finished");
            }
        }
        catch (error) {
            logger.error({ err: error }, "Import worker drain failed; it will retry");
        }

        if (statsRefreshPending) {
            try {
                await refreshStats();
                statsRefreshPending = false;
                logger.info({}, "Import worker refreshed user stats");
            }
            catch (error) {
                logger.error({ err: error }, "Import worker stats refresh failed; it will retry");
            }
        }

        if (!signal.aborted) {
            await wakeSignal.wait(fallbackIntervalMs, signal);
        }
    }
};
