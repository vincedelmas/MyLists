import {z} from "zod";
import {AchievementCategory} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const calculateAchievementsTask = defineTask({
    name: "calculate-achievements" as const,
    visibility: "admin",
    description: "Calculate achievements and rarity for all users",
    inputSchema: z.object({
        categories: z.array(z.enum(AchievementCategory)).optional().describe("Categories to calculate (all if omitted)"),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const achievementsService = container.services.achievements;

        await ctx.step("seed-achievements", async () => {
            const seededCount = achievementsService.seedAllAchievements();
            ctx.metric("achievements.seeded", seededCount);
        });

        const categoriesToProcess = input.categories && input.categories.length > 0
            ? input.categories
            : achievementsService.getAllCatalogCategories();

        for (const category of categoriesToProcess) {
            await ctx.step(`calculate-${category}`, async () => {
                const { processed, total } = achievementsService.calculateCategory(category);
                ctx.metric(`${category}.total`, total);
                ctx.metric(`${category}.processed`, processed);
            });
        }

        await ctx.step("calculate-rarity", async () => {
            achievementsService.calculateAllAchievementsRarity();
        });
    },
});
