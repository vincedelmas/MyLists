import {z} from "zod";
import {MEDIA_TYPES} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {withTransaction} from "@/lib/server/database/async-storage";


export const seedAchievementsTask = defineTask({
    name: "seed-achievements" as const,
    visibility: "admin",
    description: "Seed achievement definitions for all media types",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const mediaTypes = MEDIA_TYPES;
        const container = await getContainer();
        const achievements = container.achievements;

        for (const mediaType of mediaTypes) {
            await ctx.step(`seed-${mediaType}`, async () => {
                const achievementsDef = container.media.get(mediaType).contributions.achievements.definitions;

                const definitionCount = Object.keys(achievementsDef).length;
                ctx.metric(`${mediaType}.definitions_found`, definitionCount);

                if (definitionCount === 0) {
                    ctx.info(`No achievement definitions found for ${mediaType}.`);
                    return;
                }

                await withTransaction(async () => {
                    await achievements.seedAchievements(achievementsDef);
                });

                ctx.metric(`${mediaType}.seeded`, definitionCount);
            });
        }
    },
});
