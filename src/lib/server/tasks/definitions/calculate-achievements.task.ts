import {z} from "zod";
import {MEDIA_TYPES, MediaType} from "@/lib/utils/enums";
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
        const achievementsQuery = container.achievements.query;
        const achievementCommands = container.achievements.commands;
        const allAchievements = await achievementsQuery.getAllAchievements();

        const mediaTypes = input.mediaTypes;
        const typesToProcess = mediaTypes && mediaTypes.length > 0 ? mediaTypes : MEDIA_TYPES;

        for (const mediaType of typesToProcess) {
            await ctx.step(`calculate-${mediaType}`, async () => {
                const mediaAchievements = allAchievements.filter((ach) => ach.mediaType === mediaType);
                const calculator = container.media.get(mediaType).achievements.calculator;

                ctx.metric(`${mediaType}.count`, mediaAchievements.length);

                for (const achievement of mediaAchievements) {
                    try {
                        await achievementCommands.calculateAchievementFromCte(achievement, calculator.getAchievementCte(achievement));
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
            await achievementCommands.calculateAllAchievementsRarity();
        });
    },
});
