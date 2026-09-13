import {tmpdir} from "node:os";
import {join} from "node:path";
import {mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


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
    let directory: string;
    let databasePath: string;
    const importProcessor = { requeueInterruptedJobs: vi.fn() };

    beforeEach(() => {
        vi.resetAllMocks();
        directory = mkdtempSync(join(tmpdir(), "mylists-drain-command-"));
        databasePath = join(directory, "site.db");
        writeFileSync(databasePath, "");
        getContainer.mockResolvedValue({ services: { importProcessor } });
    });

    afterEach(() => rmSync(directory, { recursive: true, force: true }));

    it("recovers interrupted imports before draining with the container import processor", async () => {
        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 2 });

        await expect(runImportDrainCommand(databasePath)).resolves.toEqual({ failedJobs: 0, processedJobs: 2 });

        expect(importProcessor.requeueInterruptedJobs).toHaveBeenCalledOnce();
        expect(importProcessor.requeueInterruptedJobs.mock.invocationCallOrder[0]).toBeLessThan(drainImportJobs.mock.invocationCallOrder[0]);
        expect(drainImportJobs).toHaveBeenCalledWith(importProcessor);
        expect(logger.info).toHaveBeenCalledWith({ processedJobs: 2, failedJobs: 0 }, "Import drain finished");
        expect(runTask).toHaveBeenCalledWith({
            input: {},
            triggeredBy: "cron/cli",
            taskName: "compute-all-users-stats",
        });
    });

    it("does not recompute stats when no import job was processed", async () => {
        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 0 });

        await expect(runImportDrainCommand(databasePath)).resolves.toEqual({ failedJobs: 0, processedJobs: 0 });

        expect(runTask).not.toHaveBeenCalled();
    });

    it("recomputes stats when a job failed during processing", async () => {
        drainImportJobs.mockResolvedValue({ failedJobs: 1, processedJobs: 0 });

        await expect(runImportDrainCommand(databasePath)).resolves.toEqual({ failedJobs: 1, processedJobs: 0 });

        expect(runTask).toHaveBeenCalledWith({
            input: {},
            triggeredBy: "cron/cli",
            taskName: "compute-all-users-stats",
        });
    });

    it("releases the lock after recovery fails and allows a later run", async () => {
        importProcessor.requeueInterruptedJobs.mockImplementationOnce(() => { throw new Error("Database unavailable"); });
        await expect(runImportDrainCommand(databasePath)).rejects.toThrow("Database unavailable");
        expect(drainImportJobs).not.toHaveBeenCalled();
        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 1 });
        await expect(runImportDrainCommand(databasePath)).resolves.toEqual({ failedJobs: 0, processedJobs: 1 });
    });
});
