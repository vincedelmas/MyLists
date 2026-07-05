import {TaskName} from "@/lib/server/tasks/registry";


export type TaskVisibility = "admin" | "user";
export type TaskFormValues = Record<string, any>;
export type TaskStatus = "completed" | "failed" | "partial";
export type TaskTrigger = "user" | "cron/cli" | "dashboard";
export type TaskInputValue = string | number | boolean | null | TaskInputValue[] | { [key: string]: TaskInputValue | undefined };


export type TaskStep = {
    name: string;
    error?: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    children?: TaskStep[];
    metrics: Record<string, number | string>;
    status: "completed" | "failed" | "skipped" | "partial";
};

export type TaskLog = {
    time: string;
    step?: string;
    message: string;
    data?: Record<string, any>;
    level: "info" | "warn" | "error";
};

export type TaskResult = {
    taskId: string;
    logs: TaskLog[];
    taskName: string;
    startedAt: string;
    steps: TaskStep[];
    finishedAt: string;
    durationMs: number;
    status: TaskStatus;
    triggeredBy: TaskTrigger;
    errorMessage: string | null;
    metrics: Record<string, number | string>;
};

export type TaskInputProperty = {
    format?: string;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    multipleOf?: number;
    description?: string;
    default?: TaskInputValue;
    enum?: Array<string | number | boolean | null>;
    items?: TaskInputProperty | TaskInputProperty[];
    type?: "object" | "array" | "string" | "number" | "boolean" | "null" | "integer";
};

export type TaskInputSchema = TaskInputProperty & {
    type: "object";
    required?: string[];
    properties: Record<string, TaskInputProperty>;
};

export type TaskMetadata = {
    name: string;
    description: string;
    visibility: TaskVisibility;
    inputSchema: TaskInputSchema;
}

export type SaveTaskToDb = {
    taskId: string,
    userId?: number,
    logs: TaskResult,
    startedAt: string,
    finishedAt: string,
    taskName: TaskName,
    status: TaskStatus;
    triggeredBy: TaskTrigger,
    errorMessage: string | null,
}
