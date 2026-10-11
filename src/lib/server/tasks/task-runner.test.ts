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

    it("preserves an unhandled error after saving the failure", async () => {
        const error = new Error("Task initialization failed", { cause: new Error("Connection lost") });
        handler.mockRejectedValue(error);

        await expect(runTask(options)).rejects.toBe(error);
        expect(saveTaskToDb).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            status: "failed",
            errorMessage: error.message,
        }));
    });

});
