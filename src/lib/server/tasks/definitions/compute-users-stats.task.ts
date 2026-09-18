import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {withTransaction} from "@/lib/server/database/async-storage";


export const computeUsersStatsTask = defineTask({
    name: "compute-users-stats" as const,
    visibility: "admin",
    description: "Recompute pre-computed stats for all users or specific users",
    inputSchema: z.object({
        userIds: z.array(z.number().int().positive()).optional().describe("User IDs to recompute (all users if omitted)"),
    }),
    handler: async (ctx, { userIds }) => {
        const container = await getContainer();
        const mediaTypes = Object.values(MediaType);
        const statsService = container.services.stats;
        const mediaStatsRegistry = container.registries.mediaStatistics;

        for (const mediaType of mediaTypes) {
            await ctx.step(`stats-${mediaType}`, async () => {
                const mediaStatistics = mediaStatsRegistry.get(mediaType);

                withTransaction(() => {
                    const userMediaStats = mediaStatistics.computeAllUsersStats(userIds);

                    if (userMediaStats.length === 0) {
                        ctx.warn(`No users found with ${mediaType} data to compute.`);
                    }

                    statsService.updateAllUsersPreComputedStats(mediaType, userMediaStats);
                });
            });
        }
    },
});
