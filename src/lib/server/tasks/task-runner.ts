import {z} from "zod";
import {randomUUID} from "node:crypto";
import {getContainer} from "@/lib/server/core/container";
import {createTaskContext} from "@/lib/server/tasks/task-context";
import {TaskResult, TaskStatus, TaskTrigger} from "@/lib/types/tasks.types";
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

    let result: TaskResult;
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
        result = finalize(status, errorMessage);

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

    if (result.status !== "completed") {
        throw new Error(result.errorMessage ?? `Task ${taskName} finished with status ${result.status}. Check archived task logs for details.`);
    }
};
