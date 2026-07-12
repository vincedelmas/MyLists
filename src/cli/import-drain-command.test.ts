import {beforeEach, describe, expect, it, vi} from "vitest";


const { drainImportJobs } = vi.hoisted(() => ({
    drainImportJobs: vi.fn(),
}));

const { runTask } = vi.hoisted(() => ({
    runTask: vi.fn(),
}));

const { getContainer } = vi.hoisted(() => ({
    getContainer: vi.fn(),
}));

const { logger } = vi.hoisted(() => ({
    logger: {
        info: vi.fn(),
    },
}));


vi.mock("@/lib/server/core/logger", () => ({ logger }));
vi.mock("@/lib/server/tasks/task-runner", () => ({ runTask }));
vi.mock("@/lib/server/core/container", () => ({ getContainer }));
vi.mock("@/lib/server/domain/imports/import-drain", () => ({ drainImportJobs }));


const { runImportDrainCommand } = await import("@/cli/import-drain-command");


describe("runImportDrainCommand", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("drains imports with the container import processor", async () => {
        const importProcessor = {};

        getContainer.mockResolvedValue({ services: { importProcessor } });
        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 2 });

        await expect(runImportDrainCommand()).resolves.toEqual({ failedJobs: 0, processedJobs: 2 });

        expect(drainImportJobs).toHaveBeenCalledWith(importProcessor);
        expect(logger.info).toHaveBeenCalledWith({ processedJobs: 2, failedJobs: 0 }, "Import drain finished");
        expect(runTask).toHaveBeenCalledWith({
            input: {},
            triggeredBy: "cron/cli",
            taskName: "compute-all-users-stats",
        });
    });

    it("does not recompute stats when no import job was processed", async () => {
        const importProcessor = {};

        getContainer.mockResolvedValue({ services: { importProcessor } });
        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 0 });

        await expect(runImportDrainCommand()).resolves.toEqual({ failedJobs: 0, processedJobs: 0 });

        expect(runTask).not.toHaveBeenCalled();
    });

    it("recomputes stats when a job failed during processing", async () => {
        const importProcessor = {};

        getContainer.mockResolvedValue({ services: { importProcessor } });
        drainImportJobs.mockResolvedValue({ failedJobs: 1, processedJobs: 0 });

        await expect(runImportDrainCommand()).resolves.toEqual({ failedJobs: 1, processedJobs: 0 });

        expect(runTask).toHaveBeenCalledWith({
            input: {},
            triggeredBy: "cron/cli",
            taskName: "compute-all-users-stats",
        });
    });
});
