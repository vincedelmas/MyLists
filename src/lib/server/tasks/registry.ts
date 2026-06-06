import {z} from "zod";
import {TaskMetadata} from "@/lib/types/tasks.types";
import {createUserTask} from "@/lib/server/tasks/definitions/create-user.task";
import {maintenanceTask} from "@/lib/server/tasks/definitions/maintenance.task";
import {dbMaintenanceTask} from "@/lib/server/tasks/definitions/db-maintenance.task";
import {lockOldMoviesTask} from "@/lib/server/tasks/definitions/lock-old-movies.task";
import {checkHltbWorksTask} from "@/lib/server/tasks/definitions/check-hltb-works.task";
import {seedAchievementsTask} from "@/lib/server/tasks/definitions/seed-achievements.task";
import {flushApiMonitoringTask} from "@/lib/server/tasks/definitions/flush-api-monitoring.task";
import {bulkMediaRefreshTask} from "@/lib/server/tasks/definitions/bulk-media-refresh.task";
import {removeAllOrphansMediaTask} from "@/lib/server/tasks/definitions/remove-all-orphans-media";
import {calculateAchievementsTask} from "@/lib/server/tasks/definitions/calculate-achievements.task";
import {computeAllUsersStatsTask} from "@/lib/server/tasks/definitions/compute-all-users-stats.task";
import {addGenresToBooksUsingLlmTask} from "@/lib/server/tasks/definitions/add-books-genres-llm.task";
import {precomputePlatformStatsTask} from "@/lib/server/tasks/definitions/precompute-platform-stats.task";
import {deleteNonActivatedUsersTask} from "@/lib/server/tasks/definitions/delete-non-activated-users.task";
import {removeUnusedMediaCoversTask} from "@/lib/server/tasks/definitions/remove-unused-media-covers.task";
import {createMediaNotificationsTask} from "@/lib/server/tasks/definitions/create-media-notifications.task";
import {removeUnusedProfileImagesTask} from "@/lib/server/tasks/definitions/remove-unused-profile-images.task";


export const taskRegistry = {
    [createUserTask.name]: createUserTask,
    [maintenanceTask.name]: maintenanceTask,
    [lockOldMoviesTask.name]: lockOldMoviesTask,
    [dbMaintenanceTask.name]: dbMaintenanceTask,
    [checkHltbWorksTask.name]: checkHltbWorksTask,
    [bulkMediaRefreshTask.name]: bulkMediaRefreshTask,
    [seedAchievementsTask.name]: seedAchievementsTask,
    [flushApiMonitoringTask.name]: flushApiMonitoringTask,
    [computeAllUsersStatsTask.name]: computeAllUsersStatsTask,
    [calculateAchievementsTask.name]: calculateAchievementsTask,
    [removeAllOrphansMediaTask.name]: removeAllOrphansMediaTask,
    [deleteNonActivatedUsersTask.name]: deleteNonActivatedUsersTask,
    [removeUnusedMediaCoversTask.name]: removeUnusedMediaCoversTask,
    [precomputePlatformStatsTask.name]: precomputePlatformStatsTask,
    [createMediaNotificationsTask.name]: createMediaNotificationsTask,
    [addGenresToBooksUsingLlmTask.name]: addGenresToBooksUsingLlmTask,
    [removeUnusedProfileImagesTask.name]: removeUnusedProfileImagesTask,
};


export type TaskName = keyof typeof taskRegistry;


export const getTask = (name: string) => {
    const task = taskRegistry[name as TaskName];
    if (!task) return null;
    return task;
};


export const getAllTasks = () => {
    return Object.values(taskRegistry);
};


export const getAllTasksMetadata = (): TaskMetadata[] => {
    return getAllTasks().map((task) => ({
        name: task.name,
        visibility: task.visibility,
        description: task.description,
        inputSchema: zodToJsonSchema(task.inputSchema),
    }));
}


function zodToJsonSchema(schema: z.ZodType): TaskMetadata["inputSchema"] {
    const properties: TaskMetadata["inputSchema"]["properties"] = {};
    const jsonSchema = z.toJSONSchema(schema, { io: "input" }) as {
        type?: string;
        required?: string[];
        properties?: Record<string, {
            default?: any;
            enum?: unknown[];
            description?: string;
            type?: string | string[];
        }>;
    };
    const requiredKeys = new Set(jsonSchema.required ?? []);

    for (const [key, propertySchema] of Object.entries(jsonSchema.properties ?? {})) {
        const type = normalizeJsonSchemaType(propertySchema.type);
        const enumValues = type === "array"
            ? undefined
            : getStringEnumValues(propertySchema.enum);

        properties[key] = {
            type,
            enum: enumValues,
            required: requiredKeys.has(key),
            default: propertySchema.default,
            description: propertySchema.description,
        };
    }

    return { type: jsonSchema.type ?? "object", properties };
}


function normalizeJsonSchemaType(type: string | string[] | undefined) {
    if (Array.isArray(type)) return type.find((val) => val !== "null") ?? "string";
    return type ?? "string";
}


function getStringEnumValues(values: unknown[] | undefined) {
    if (!values) return undefined;
    const stringValues = values.filter((val): val is string => typeof val === "string");
    return stringValues.length > 0 ? stringValues : undefined;
}
