import {beforeEach, describe, expect, it, vi} from "vitest";
import type {SaveTaskToDb} from "@/lib/types/tasks.types";
import type {TaskContext} from "@/lib/server/tasks/task-context";
import {runTask} from "@/lib/server/tasks/task-runner";


const { handler, saveTaskToDb } = vi.hoisted(() => ({
    handler: vi.fn<(ctx: TaskContext, input: Record<string, never>) => Promise<void>>(),
    saveTaskToDb: vi.fn<(data: SaveTaskToDb) => Promise<void>>(),
}));

vi.mock("@/lib/server/tasks/registry", () => ({ getTask: () => ({ handler }) }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({ services: { admin: { saveTaskToDb } } }),
}));
vi.mock("@/lib/server/core/logger", () => ({
    logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));


const options = { taskName: "maintenance", input: {}, triggeredBy: "cron/cli" } as const;


describe("runTask", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("saves successful tasks without steps and resolves", async () => {
        handler.mockImplementation(async (ctx) => {
            ctx.metric("flushedRollups", 3);
        });

        await expect(runTask(options)).resolves.toBeUndefined();
        expect(saveTaskToDb).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            status: "completed",
            errorMessage: null,
            logs: expect.objectContaining({ steps: [], metrics: { flushedRollups: 3 } }),
        }));
    });

    it("keeps warning-only steps successful", async () => {
        handler.mockImplementation(async (ctx) => {
            await ctx.step("optional-integration", async () => {
                ctx.warn("Integration not configured; skipping");
            });
        });

        await expect(runTask(options)).resolves.toBeUndefined();
        expect(saveTaskToDb).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    });

    it("waits for the failed task to be saved before rejecting a swallowed step error", async () => {
        handler.mockImplementation(async (ctx) => {
            await ctx.step("refresh", async () => {
                throw new Error("Provider unavailable");
            });
        });

        let finishSaving!: () => void;
        saveTaskToDb.mockImplementation(() => new Promise<void>((resolve) => { finishSaving = resolve; }));

        let settled = false;
        const execution = runTask(options).finally(() => { settled = true; });
        const rejection = expect(execution).rejects.toThrow("Provider unavailable");

        await vi.waitFor(() => expect(saveTaskToDb).toHaveBeenCalledOnce());
        expect(settled).toBe(false);
        expect(saveTaskToDb).toHaveBeenCalledWith(expect.objectContaining({
            status: "failed",
            errorMessage: "Provider unavailable",
            logs: expect.objectContaining({
                steps: [expect.objectContaining({ name: "refresh", status: "failed" })],
            }),
        }));

        finishSaving();
        await rejection;
    });

    it("runs remaining steps before saving and rejecting a partially failed task", async () => {
        const completedStep = vi.fn();
        handler.mockImplementation(async (ctx) => {
            await ctx.step("refresh", async () => {
                throw new Error("Provider unavailable");
            });
            await ctx.step("cleanup", async () => { completedStep(); });
        });

        await expect(runTask(options)).rejects.toThrow("Provider unavailable");
        expect(completedStep).toHaveBeenCalledOnce();
        expect(saveTaskToDb).toHaveBeenCalledWith(expect.objectContaining({
            status: "partial",
            logs: expect.objectContaining({
                steps: [
                    expect.objectContaining({ name: "refresh", status: "failed" }),
                    expect.objectContaining({ name: "cleanup", status: "completed" }),
                ],
            }),
        }));
    });

    it("reports a failed nested task as failed and rejects", async () => {
        handler.mockImplementation(async (ctx) => {
            await ctx.step("refresh-all", async () => {
                await ctx.step("movies", async () => {
                    throw new Error("Movie refresh failed");
                });
            });
        });

        await expect(runTask(options)).rejects.toThrow("Movie refresh failed");
        expect(saveTaskToDb).toHaveBeenCalledWith(expect.objectContaining({
            status: "failed",
            errorMessage: "Movie refresh failed",
        }));
    });

    it.each([false, true])("rejects logged errors without an exception (inside step: %s)", async (insideStep) => {
        handler.mockImplementation(async (ctx) => {
            if (insideStep) {
                await ctx.step("refresh", async () => { ctx.error("Some media could not be refreshed"); });
            }
            else {
                ctx.error("Some media could not be refreshed");
            }
        });

        await expect(runTask(options)).rejects.toThrow("Task maintenance finished with status partial");
        expect(saveTaskToDb).toHaveBeenCalledWith(expect.objectContaining({ status: "partial" }));
    });

    it("preserves an unhandled error after saving the failure", async () => {
        const error = new Error("Task initialization failed", { cause: new Error("Connection lost") });
        handler.mockRejectedValue(error);

        await expect(runTask(options)).rejects.toBe(error);
        expect(saveTaskToDb).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            status: "failed",
            errorMessage: error.message,
        }));
    });

    it("propagates a failure to save the task result", async () => {
        const error = new Error("Cannot save task history");
        saveTaskToDb.mockRejectedValue(error);

        await expect(runTask(options)).rejects.toBe(error);
    });
});
