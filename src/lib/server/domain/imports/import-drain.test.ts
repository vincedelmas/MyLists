import {describe, expect, it, vi} from "vitest";
import {ImportJobStatus} from "@/lib/utils/enums";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";


describe("drainImportJobs", () => {
    it("processes jobs sequentially until no queued job is claimed", async () => {
        const processor = createProcessor({
            processNextJob: vi.fn()
                .mockResolvedValueOnce({ id: 1, status: ImportJobStatus.COMPLETED })
                .mockResolvedValueOnce({ id: 2, status: ImportJobStatus.COMPLETED_WITH_ERRORS })
                .mockResolvedValueOnce(null),
        });

        await expect(drainImportJobs(processor as any)).resolves.toEqual({ failedJobs: 0, processedJobs: 2 });
        expect(processor.requeueStaleProcessingJobs).toHaveBeenCalledTimes(1);
        expect(processor.processNextJob).toHaveBeenCalledTimes(3);
    });

    it("continues draining after a persisted job failure and counts failed jobs", async () => {
        const processor = createProcessor({
            processNextJob: vi.fn()
                .mockResolvedValueOnce({ id: 1, status: ImportJobStatus.FAILED })
                .mockResolvedValueOnce({ id: 2, status: ImportJobStatus.COMPLETED })
                .mockResolvedValueOnce(null),
        });

        await expect(drainImportJobs(processor as any)).resolves.toEqual({ failedJobs: 1, processedJobs: 1 });
        expect(processor.processNextJob).toHaveBeenCalledTimes(3);
    });

    it("stops on infrastructure errors instead of retrying forever", async () => {
        const error = new Error("Database unavailable");
        const processor = createProcessor({ processNextJob: vi.fn().mockRejectedValue(error) });
        await expect(drainImportJobs(processor as any)).rejects.toBe(error);
        expect(processor.processNextJob).toHaveBeenCalledOnce();
    });

    it("returns zero when there is no queued job", async () => {
        const processor = createProcessor({
            processNextJob: vi.fn().mockResolvedValue(null),
        });

        await expect(drainImportJobs(processor as any)).resolves.toEqual({ failedJobs: 0, processedJobs: 0 });
        expect(processor.processNextJob).toHaveBeenCalledTimes(1);
    });
});


const createProcessor = (overrides: { processNextJob: ReturnType<typeof vi.fn> }) => ({
    requeueStaleProcessingJobs: vi.fn().mockReturnValue([]),
    ...overrides,
});
