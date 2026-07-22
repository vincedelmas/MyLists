import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {withTransaction} from "@/lib/server/database/async-storage";


export const computeAllUsersStatsTask = defineTask({
    name: "compute-all-users-stats" as const,
    visibility: "admin",
    description: "Recompute pre-computed stats for all users",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaTypes = Object.values(MediaType);
        const userStatsService = container.services.userStats;
        const mediaStatsRegistry = container.registries.mediaStatistics;

        for (const mediaType of mediaTypes) {
            await ctx.step(`stats-${mediaType}`, async () => {
                const mediaStatistics = mediaStatsRegistry.get(mediaType);

                await withTransaction(async () => {
                    const userMediaStats = await mediaStatistics.computeAllUsersStats();

                    if (userMediaStats.length === 0) {
                        ctx.warn(`No users found with ${mediaType} data to compute.`);
                    }

                    await userStatsService.updateAllUsersPreComputedStats(mediaType, userMediaStats);
                });
            });
        }
    },
});
