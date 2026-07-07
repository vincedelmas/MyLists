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


vi.mock("@/lib/server/core/container", () => ({ getContainer }));
vi.mock("@/lib/server/tasks/task-runner", () => ({ runTask }));
vi.mock("@/lib/server/domain/imports/import-drain", () => ({ drainImportJobs }));


const { runImportDrainCommand } = await import("@/cli/import-drain-command");


describe("runImportDrainCommand", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(console, "log").mockImplementation(() => undefined);
    });

    it("drains imports with the container import processor", async () => {
        const importProcessor = {};

        getContainer.mockResolvedValue({ services: { importProcessor } });
        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 2 });

        await expect(runImportDrainCommand()).resolves.toEqual({ failedJobs: 0, processedJobs: 2 });

        expect(drainImportJobs).toHaveBeenCalledWith(importProcessor);
        expect(console.log).toHaveBeenCalledWith("Import drain finished. Processed jobs: 2. Failed jobs: 0");
        expect(runTask).toHaveBeenCalledWith({
            input: {},
            taskName: "compute-all-users-stats",
            triggeredBy: "cron/cli",
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
            taskName: "compute-all-users-stats",
            triggeredBy: "cron/cli",
        });
    });
});
