import {z} from "zod";
import {randomUUID} from "node:crypto";
import {getContainer} from "@/lib/server/core/container";
import {TaskStatus, TaskTrigger} from "@/lib/types/tasks.types";
import {createTaskContext} from "@/lib/server/tasks/task-context";
import {getTask, TaskName, taskRegistry} from "@/lib/server/tasks/registry";


type RunTaskOptions<TName extends TaskName> = {
    taskName: TName;
    triggeredBy: TaskTrigger;
    input: typeof taskRegistry[TName] extends { inputSchema: infer S } ? S extends z.ZodType ? z.infer<S> : never : never;
};


export const runTask = async <T extends TaskName>(options: RunTaskOptions<T>) => {
    const { taskName, input, triggeredBy } = options;

    const taskId = randomUUID();
    const task = getTask(taskName)!;
    const container = await getContainer();
    const adminService = container.services.admin;
    const { ctx, finalize } = createTaskContext({ taskId, taskName, triggeredBy });

    let status: TaskStatus = "completed";
    let errorMessage: string | undefined;

    try {
        await task.handler(ctx, input);
    }
    catch (err) {
        status = "failed";
        errorMessage = err instanceof Error ? err.message : String(err);
        ctx.error("Task failed with unhandled error", { error: errorMessage });

        throw err;
    }
    finally {
        const result = finalize(status, errorMessage);

        await adminService.saveTaskToDb({
            taskId,
            taskName,
            triggeredBy,
            logs: result,
            status: result.status,
            startedAt: result.startedAt,
            finishedAt: result.finishedAt,
            errorMessage: result.errorMessage,
        });
    }
};
