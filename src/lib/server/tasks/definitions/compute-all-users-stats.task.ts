import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {computeAllUsersStats} from "@/lib/server/domain/user/compute-all-users-stats";


export const computeAllUsersStatsTask = defineTask({
    name: "compute-all-users-stats" as const,
    visibility: "admin",
    description: "Recompute pre-computed stats for all users",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaStatsRegistry = container.registries.mediaStatistics;

        await computeAllUsersStats(mediaStatsRegistry, {
            onEmpty: (mediaType) => ctx.warn(`No users found with ${mediaType} data to compute.`),
            runStep: (mediaType, operation) => ctx.step(`stats-${mediaType}`, operation),
        });
    },
});
