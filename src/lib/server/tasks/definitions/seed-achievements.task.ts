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
        const achievementsService = container.services.achievements;
        const achievementsRegistry = container.registries.mediaAchievements;

        for (const mediaType of mediaTypes) {
            await ctx.step(`seed-${mediaType}`, async () => {
                const catalog = achievementsRegistry.get(mediaType);
                const achievementsDefinitions = catalog.definitions;

                const definitionCount = Object.keys(achievementsDefinitions).length;
                ctx.metric(`${mediaType}.definitions_found`, definitionCount);

                if (definitionCount === 0) {
                    ctx.info(`No achievement definitions found for ${mediaType}.`);
                    return;
                }

                await withTransaction(async () => {
                    await achievementsService.seedAchievements(catalog.mediaType, achievementsDefinitions);
                });

                ctx.metric(`${mediaType}.seeded`, definitionCount);
            });
        }
    },
});
