import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const seedAchievementsTask = defineTask({
    name: "seed-achievements" as const,
    visibility: "admin",
    description: "Seed flat achievement definitions for all categories",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        await ctx.step("seed-all-achievements", async () => {
            const seededCount = container.services.achievements.seedAllAchievements();
            ctx.metric("achievements.seeded", seededCount);
        });
    },
});
