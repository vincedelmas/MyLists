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

    it("continues draining after a processor error and counts failed jobs", async () => {
        const processor = createProcessor({
            processNextJob: vi.fn()
                .mockRejectedValueOnce(new Error("matcher crashed"))
                .mockResolvedValueOnce({ id: 2, status: ImportJobStatus.COMPLETED })
                .mockResolvedValueOnce(null),
        });

        await expect(drainImportJobs(processor as any)).resolves.toEqual({ failedJobs: 1, processedJobs: 1 });
        expect(processor.processNextJob).toHaveBeenCalledTimes(3);
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
    requeueStaleProcessingJobs: vi.fn().mockResolvedValue([]),
    ...overrides,
});
