import {z} from "zod";
import {MEDIA_TYPES} from "@/lib/utils/enums";
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
        const mediaTypes = MEDIA_TYPES;

        for (const mediaType of mediaTypes) {
            await ctx.step(`stats-${mediaType}`, async () => {
                await withTransaction(async () => {
                    const userCount = await container.media.get(mediaType).library.stats.rebuild();

                    if (userCount === 0) {
                        ctx.warn(`No users found with ${mediaType} data to compute.`);
                    }
                    ctx.metric(`${mediaType}.users`, userCount);
                });
            });
        }
    },
});
