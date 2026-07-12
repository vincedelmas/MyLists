import {logger} from "@/lib/server/core/logger";
import {TaskName} from "@/lib/server/tasks/registry";
import {TaskLog, TaskResult, TaskStatus, TaskStep, TaskTrigger} from "@/lib/types/tasks.types";


export type StepFn<T = void> = () => Promise<T>;


export interface TaskContext {
    taskId: string;
    taskName: TaskName;
    triggeredBy: TaskTrigger;
    increment: (key: string, by?: number) => void;
    metric: (key: string, value: number | string) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    step: <T>(name: string, fn: StepFn<T>) => Promise<T | undefined>;
    error: (message: string, data?: Record<string, unknown>) => void;
}


type TaskContextOptions = {
    taskId: string;
    taskName: TaskName;
    triggeredBy: TaskTrigger;
};


export const createTaskContext = (options: TaskContextOptions) => {
    const { taskId, taskName, triggeredBy } = options;

    const startedAtMs = Date.now();
    const startedAt = new Date().toISOString();
    const taskLogger = logger.child({ taskId, taskName });

    const logs: TaskLog[] = [];
    const steps: TaskStep[] = [];
    const metrics: Record<string, number | string> = {};

    const stepStack: TaskStep[] = [];
    const stepErrorCounts = new WeakMap<TaskStep, { errors: number; warnings: number }>();

    const getCurrentStepName = () => {
        return stepStack.at(-1)?.name;
    }

    const addLog = (level: "info" | "warn" | "error", message: string, data?: Record<string, any>) => {
        const logEntry: TaskLog = {
            data,
            level,
            message,
            step: getCurrentStepName(),
            time: new Date().toISOString(),
        };

        if (process.env.NODE_ENV !== "test") {
            taskLogger[level]({ step: getCurrentStepName(), ...data }, message);
        }

        if (level !== "info") {
            logs.push(logEntry);

            // Track errors/warnings for current step
            const currentStep = stepStack.at(-1);
            if (currentStep) {
                const counts = stepErrorCounts.get(currentStep) ?? { errors: 0, warnings: 0 };
                if (level === "error") counts.errors++;
                if (level === "warn") counts.warnings++;
                stepErrorCounts.set(currentStep, counts);
            }
        }
    };

    const ctx: TaskContext = {
        taskId,
        taskName,
        triggeredBy,
        step: async <T>(name: string, fn: StepFn<T>): Promise<T | undefined> => {
            const stepStart = Date.now();
            const stepStartedAt = new Date().toISOString();

            const originalMetric = ctx.metric;
            const originalIncrement = ctx.increment;
            const stepMetrics: Record<string, number | string> = {};

            ctx.metric = (key, value) => {
                metrics[key] = value;
                stepMetrics[key] = value;
            };

            ctx.increment = (key, by = 1) => {
                const current = (stepMetrics[key] as number) || 0;
                stepMetrics[key] = current + by;
                metrics[key] = ((metrics[key] as number) || 0) + by;
            };

            const stepObj: TaskStep = {
                name,
                children: [],
                durationMs: 0,
                finishedAt: "",
                status: "completed",
                metrics: stepMetrics,
                startedAt: stepStartedAt,
            };

            stepErrorCounts.set(stepObj, { errors: 0, warnings: 0 });

            const parentStep = stepStack.at(-1);
            if (parentStep) {
                parentStep.children ??= [];
                parentStep.children.push(stepObj);
            }
            else {
                steps.push(stepObj);
            }

            stepStack.push(stepObj);

            try {
                addLog("info", `Starting step: ${name}`);
                const result = await fn();
                const durationMs = Date.now() - stepStart;

                stepObj.durationMs = durationMs;
                stepObj.finishedAt = new Date().toISOString();

                const counts = stepErrorCounts.get(stepObj);
                const hasDirectErrors = counts && counts.errors > 0;

                const hasFailedChildren = stepObj.children?.some((c) => c.status === "failed");
                const hasPartialChildren = stepObj.children?.some((c) => c.status === "partial");

                if (hasFailedChildren) {
                    const allChildrenFailed = stepObj.children?.length && stepObj.children.every((c) => c.status === "failed");
                    stepObj.status = allChildrenFailed ? "failed" : "partial";
                }
                else if (hasDirectErrors || hasPartialChildren) {
                    stepObj.status = "partial";
                }
                else {
                    stepObj.status = "completed";
                }

                if (stepObj.children?.length === 0) {
                    delete stepObj.children;
                }

                addLog("info", `Completed step: ${name}`, { durationMs, ...stepMetrics });
                return result;
            }
            catch (err) {
                const durationMs = Date.now() - stepStart;
                const errorMessage = err instanceof Error ? err.message : String(err);

                stepObj.status = "failed";
                stepObj.error = errorMessage;
                stepObj.durationMs = durationMs;
                stepObj.finishedAt = new Date().toISOString();

                if (stepObj.children?.length === 0) {
                    delete stepObj.children;
                }

                addLog("error", `Step failed: ${name}`, { error: errorMessage, durationMs });
                return undefined;
            }
            finally {
                ctx.metric = originalMetric;
                ctx.increment = originalIncrement;
                stepStack.pop();
            }
        },
        metric: (key, value) => {
            metrics[key] = value;
        },
        increment: (key, by = 1) => {
            metrics[key] = ((metrics[key] as number) || 0) + by;
        },
        info: (message, data) => addLog("info", message, data),
        warn: (message, data) => addLog("warn", message, data),
        error: (message, data) => addLog("error", message, data),
    };

    const finalize = (status: TaskStatus, errorMessage?: string): TaskResult => {
        const finishedAt = new Date().toISOString();
        const durationMs = Date.now() - startedAtMs;

        const analyzeSteps = (stepList: TaskStep[]): { failed: number; partial: number } => {
            return stepList.reduce((acc, s) => {
                const childStats = s.children ? analyzeSteps(s.children) : { failed: 0, partial: 0 };
                return {
                    failed: acc.failed + (s.status === "failed" ? 1 : 0) + childStats.failed,
                    partial: acc.partial + (s.status === "partial" ? 1 : 0) + childStats.partial,
                };
            }, { failed: 0, partial: 0 });
        };

        const { failed: failedCount, partial: partialCount } = analyzeSteps(steps);
        const actualStatus: TaskStatus = errorMessage || failedCount === steps.length ? "failed"
            : failedCount > 0 || partialCount > 0 ? "partial" : status;

        const findFirstError = (stepList: TaskStep[]): string | undefined => {
            for (const s of stepList) {
                if (s.error) return s.error;
                if (s.children) {
                    const childError = findFirstError(s.children);
                    if (childError) return childError;
                }
            }
            return undefined;
        };

        return {
            logs,
            steps,
            taskId,
            metrics,
            taskName,
            startedAt,
            durationMs,
            finishedAt,
            triggeredBy,
            status: actualStatus,
            errorMessage: errorMessage || findFirstError(steps) || null,
        };
    };

    return { ctx, finalize };
};
