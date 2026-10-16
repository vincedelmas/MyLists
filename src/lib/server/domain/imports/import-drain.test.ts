import {describe, expect, it, vi} from "vitest";
import {ImportJobStatus} from "@/lib/utils/enums";
import {drainImportJobs} from "@/lib/server/domain/imports/import-drain";


describe("drainImportJobs", () => {
    it("processes jobs sequentially until no queued job is claimed", async () => {
        const processor = createProcessor({
            processNextJob: vi.fn()
                .mockResolvedValueOnce({ id: 1, userId: 10, status: ImportJobStatus.COMPLETED })
                .mockResolvedValueOnce({ id: 2, userId: 10, status: ImportJobStatus.COMPLETED_WITH_ERRORS })
                .mockResolvedValueOnce(null),
        });

        await expect(drainImportJobs(processor as any)).resolves.toEqual({ failedJobs: 0, processedJobs: 2, userIds: [10] });
        expect(processor.requeueInterruptedJobs).not.toHaveBeenCalled();
        expect(processor.processNextJob).toHaveBeenCalledTimes(3);
    });

    it("stops on infrastructure errors instead of retrying forever", async () => {
        const error = new Error("Database unavailable");
        const processor = createProcessor({ processNextJob: vi.fn().mockRejectedValue(error) });
        await expect(drainImportJobs(processor as any)).rejects.toBe(error);
        expect(processor.processNextJob).toHaveBeenCalledOnce();
    });

    it("counts paused attempts so completed rows still trigger statistics recomputation", async () => {
        const processor = createProcessor({ processNextJob: vi.fn()
            .mockResolvedValueOnce({ id: 1, userId: 10, status: ImportJobStatus.QUEUED })
            .mockResolvedValueOnce({ id: 2, userId: 10, status: ImportJobStatus.COMPLETED })
            .mockResolvedValueOnce(null),
        });
        await expect(drainImportJobs(processor as any)).resolves.toEqual({ failedJobs: 0, processedJobs: 2, userIds: [10] });
    });

});


const createProcessor = (overrides: { processNextJob: ReturnType<typeof vi.fn> }) => ({
    requeueInterruptedJobs: vi.fn().mockReturnValue([]),
    ...overrides,
});
