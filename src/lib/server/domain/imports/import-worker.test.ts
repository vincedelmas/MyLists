import {describe, expect, it, vi} from "vitest";
import {runImportWorker} from "@/lib/server/domain/imports/import-worker";


const createLogger = () => ({
    error: vi.fn(),
    info: vi.fn(),
});


describe("runImportWorker", () => {
    it("drains on startup and again after a wake notification", async () => {
        const controller = new AbortController();
        const drain = vi.fn()
            .mockResolvedValueOnce({failedJobs: 0, processedJobs: 2})
            .mockImplementationOnce(async () => {
                controller.abort();
                return {failedJobs: 0, processedJobs: 0};
            });
        const refreshStats = vi.fn().mockResolvedValue(undefined);
        const wait = vi.fn().mockResolvedValue("wake");

        await runImportWorker({
            drain,
            refreshStats,
            logger: createLogger(),
            fallbackIntervalMs: 300_000,
            signal: controller.signal,
            wakeSignal: {wait},
        });

        expect(drain).toHaveBeenCalledTimes(2);
        expect(refreshStats).toHaveBeenCalledTimes(1);
        expect(wait).toHaveBeenCalledWith(300_000, controller.signal);
    });

    it("retries a failed stats refresh even when the next drain is empty", async () => {
        const controller = new AbortController();
        const drain = vi.fn()
            .mockResolvedValueOnce({failedJobs: 1, processedJobs: 0})
            .mockImplementationOnce(async () => ({failedJobs: 0, processedJobs: 0}));
        const refreshStats = vi.fn()
            .mockRejectedValueOnce(new Error("temporary failure"))
            .mockImplementationOnce(async () => {
                controller.abort();
            });

        await runImportWorker({
            drain,
            refreshStats,
            logger: createLogger(),
            fallbackIntervalMs: 300_000,
            signal: controller.signal,
            wakeSignal: {wait: vi.fn().mockResolvedValue("wake")},
        });

        expect(drain).toHaveBeenCalledTimes(2);
        expect(refreshStats).toHaveBeenCalledTimes(2);
    });

    it("retries a transient drain failure after the next wake", async () => {
        const controller = new AbortController();
        const logger = createLogger();
        const drain = vi.fn()
            .mockRejectedValueOnce(new Error("database busy"))
            .mockImplementationOnce(async () => {
                controller.abort();
                return {failedJobs: 0, processedJobs: 0};
            });

        await runImportWorker({
            drain,
            logger,
            fallbackIntervalMs: 300_000,
            signal: controller.signal,
            refreshStats: vi.fn(),
            wakeSignal: {wait: vi.fn().mockResolvedValue("wake")},
        });

        expect(drain).toHaveBeenCalledTimes(2);
        expect(logger.error).toHaveBeenCalledWith(
            {err: expect.any(Error)},
            "Import worker drain failed; it will retry",
        );
    });
});
