import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const calculateAchievementsTask = defineTask({
    name: "calculate-achievements" as const,
    visibility: "admin",
    description: "Calculate achievements and rarity for all users",
    inputSchema: z.object({
        mediaTypes: z.array(z.enum(MediaType)).optional().describe("Media types to calculate (all if omitted)"),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const achievementsService = container.services.achievements;
        const achievementsRegistry = container.registries.mediaAchievements;
        const allAchievements = await achievementsService.getAllAchievements();

        const mediaTypes = input.mediaTypes;
        const typesToProcess = mediaTypes && mediaTypes.length > 0 ? mediaTypes : Object.values(MediaType);

        for (const mediaType of typesToProcess) {
            await ctx.step(`calculate-${mediaType}`, async () => {
                const catalog = achievementsRegistry.get(mediaType);
                const mediaAchievements = allAchievements.filter((ach) => ach.mediaType === mediaType);

                ctx.metric(`${mediaType}.count`, mediaAchievements.length);

                for (const achievement of mediaAchievements) {
                    try {
                        await achievementsService.calculateAchievement(achievement, catalog);
                        ctx.increment(`${mediaType}.processed`);
                    }
                    catch (err) {
                        ctx.warn(`Failed to calculate achievement: ${achievement.name}`, {
                            error: err instanceof Error ? err.message : String(err),
                            achievementId: achievement.id
                        });
                    }
                }
            });
        }

        await ctx.step("calculate-rarity", async () => {
            await achievementsService.calculateAllAchievementsRarity();
        });
    },
});
