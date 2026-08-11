import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";


type WakeNotificationLogger = {
    warn: (details: object, message: string) => void;
};


type WakeFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;


type ImportWorkerNotifierOptions = {
    baseUrl: string;
    fetcher?: WakeFetcher;
    logger: WakeNotificationLogger;
    maxAttempts?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
};


const delay = (durationMs: number) => new Promise(resolve => setTimeout(resolve, durationMs));


export const createImportWorkerNotifier = ({
    baseUrl,
    logger: notifierLogger,
    fetcher = fetch,
    maxAttempts = 2,
    retryDelayMs = 50,
    timeoutMs = 500,
}: ImportWorkerNotifierOptions) => {
    const wakeUrl = new URL("/wake", baseUrl);

    return async (jobId: number) => {
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                const response = await fetcher(wakeUrl, {
                    method: "POST",
                    signal: AbortSignal.timeout(timeoutMs),
                });

                if (response.ok) return true;
                lastError = new Error(`Import worker returned HTTP ${response.status}`);
            }
            catch (error) {
                lastError = error;
            }

            if (attempt < maxAttempts) {
                await delay(retryDelayMs);
            }
        }

        notifierLogger.warn({err: lastError, jobId, wakeUrl: wakeUrl.href},
            "Import worker wake notification failed; the fallback drain will recover the job");

        return false;
    };
};


export const notifyImportWorker = createImportWorkerNotifier({
    logger,
    baseUrl: serverEnv.IMPORT_WORKER_URL,
});
