import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {withTransaction} from "@/lib/server/database/async-storage";


export const seedAchievementsTask = defineTask({
    name: "seed-achievements" as const,
    visibility: "admin",
    description: "Seed achievement definitions for all media types",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaTypes = Object.values(MediaType);
        const achievementCommands = container.achievements.commands;

        for (const mediaType of mediaTypes) {
            await ctx.step(`seed-${mediaType}`, async () => {
                const achievementsDef = container.media.get(mediaType).achievements.definitions;

                const definitionCount = Object.keys(achievementsDef).length;
                ctx.metric(`${mediaType}.definitions_found`, definitionCount);

                if (definitionCount === 0) {
                    ctx.info(`No achievement definitions found for ${mediaType}.`);
                    return;
                }

                await withTransaction(async () => {
                    await achievementCommands.seedAchievements(achievementsDef);
                });

                ctx.metric(`${mediaType}.seeded`, definitionCount);
            });
        }
    },
});
