import {describe, expect, it, vi} from "vitest";
import {createImportWorkerNotifier} from "@/lib/server/core/import-worker-notifier";


const createLogger = () => ({warn: vi.fn()});


describe("createImportWorkerNotifier", () => {
    it("wakes the worker after a job is committed", async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(null, {status: 202}));
        const notifier = createImportWorkerNotifier({
            fetcher,
            logger: createLogger(),
            baseUrl: "http://import-worker:3001",
        });

        await expect(notifier(42)).resolves.toBe(true);
        expect(fetcher).toHaveBeenCalledWith(new URL("http://import-worker:3001/wake"), {
            method: "POST",
            signal: expect.any(AbortSignal),
        });
    });

    it("retries a transient notification failure", async () => {
        const fetcher = vi.fn()
            .mockRejectedValueOnce(new Error("connection refused"))
            .mockResolvedValueOnce(new Response(null, {status: 202}));
        const notifier = createImportWorkerNotifier({
            fetcher,
            retryDelayMs: 0,
            logger: createLogger(),
            baseUrl: "http://import-worker:3001",
        });

        await expect(notifier(42)).resolves.toBe(true);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("leaves recovery to the fallback drain when delivery fails", async () => {
        const error = new Error("connection refused");
        const fetcher = vi.fn().mockRejectedValue(error);
        const notifierLogger = createLogger();
        const notifier = createImportWorkerNotifier({
            fetcher,
            retryDelayMs: 0,
            logger: notifierLogger,
            baseUrl: "http://import-worker:3001",
        });

        await expect(notifier(42)).resolves.toBe(false);
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(notifierLogger.warn).toHaveBeenCalledWith({
            err: error,
            jobId: 42,
            wakeUrl: "http://import-worker:3001/wake",
        }, "Import worker wake notification failed; the fallback drain will recover the job");
    });
});
