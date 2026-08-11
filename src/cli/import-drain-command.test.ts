import {beforeEach, describe, expect, it, vi} from "vitest";


const { drainImportJobs } = vi.hoisted(() => ({
    drainImportJobs: vi.fn(),
}));

const { computeAllUsersStats } = vi.hoisted(() => ({
    computeAllUsersStats: vi.fn(),
}));

const { setupImportWorkerModule } = vi.hoisted(() => ({
    setupImportWorkerModule: vi.fn(),
}));

const { logger } = vi.hoisted(() => ({
    logger: {
        info: vi.fn(),
    },
}));


vi.mock("@/lib/server/core/logger", () => ({ logger }));
vi.mock("@/lib/server/domain/imports/import-drain", () => ({ drainImportJobs }));
vi.mock("@/lib/server/domain/user/compute-all-users-stats", () => ({ computeAllUsersStats }));
vi.mock("@/lib/server/core/container/import-worker.module", () => ({ setupImportWorkerModule }));


const { runImportDrainCommand } = await import("@/cli/import-drain-command");


describe("runImportDrainCommand", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("drains imports with the isolated worker import processor", async () => {
        const importProcessor = {};
        const mediaStatistics = {};

        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 2 });

        await expect(runImportDrainCommand({
            services: {importProcessor},
            registries: {mediaStatistics},
        } as any)).resolves.toEqual({failedJobs: 0, processedJobs: 2});

        expect(drainImportJobs).toHaveBeenCalledWith(importProcessor);
        expect(logger.info).toHaveBeenCalledWith({ processedJobs: 2, failedJobs: 0 }, "Import drain finished");
        expect(computeAllUsersStats).toHaveBeenCalledWith(mediaStatistics);
    });

    it("does not recompute stats when no import job was processed", async () => {
        const importProcessor = {};
        const mediaStatistics = {};

        drainImportJobs.mockResolvedValue({ failedJobs: 0, processedJobs: 0 });

        await expect(runImportDrainCommand({
            services: {importProcessor},
            registries: {mediaStatistics},
        } as any)).resolves.toEqual({failedJobs: 0, processedJobs: 0});

        expect(computeAllUsersStats).not.toHaveBeenCalled();
    });

    it("recomputes stats when a job failed during processing", async () => {
        const importProcessor = {};
        const mediaStatistics = {};

        drainImportJobs.mockResolvedValue({ failedJobs: 1, processedJobs: 0 });

        await expect(runImportDrainCommand({
            services: {importProcessor},
            registries: {mediaStatistics},
        } as any)).resolves.toEqual({failedJobs: 1, processedJobs: 0});

        expect(computeAllUsersStats).toHaveBeenCalledWith(mediaStatistics);
    });
});
