type ImportWorkerWakeReason = "abort" | "fallback" | "wake";


export type ImportWorkerWakeSignal = {
    wait: (fallbackIntervalMs: number, signal: AbortSignal) => Promise<ImportWorkerWakeReason>;
    wake: () => void;
};


export const createImportWorkerWakeSignal = (): ImportWorkerWakeSignal => {
    let wakePending = false;
    let activeWaiter: ((reason: ImportWorkerWakeReason) => void) | undefined;

    return {
        wake() {
            wakePending = true;
            activeWaiter?.("wake");
        },

        wait(fallbackIntervalMs, signal) {
            if (wakePending) {
                wakePending = false;
                return Promise.resolve("wake");
            }
            if (signal.aborted) return Promise.resolve("abort");

            return new Promise<ImportWorkerWakeReason>((resolve) => {
                const finish = (reason: ImportWorkerWakeReason) => {
                    clearTimeout(fallbackTimeout);
                    signal.removeEventListener("abort", handleAbort);
                    activeWaiter = undefined;

                    if (reason === "wake") {
                        wakePending = false;
                    }

                    resolve(reason);
                };
                const handleAbort = () => finish("abort");
                const fallbackTimeout = setTimeout(() => finish("fallback"), fallbackIntervalMs);

                activeWaiter = finish;
                signal.addEventListener("abort", handleAbort, {once: true});
            });
        },
    };
};
