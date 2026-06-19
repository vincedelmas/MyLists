import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {getPlatformStatsData} from "@/lib/server/domain/stats/platform-stats-data";
import {getPlatformStatsCacheKey, ONE_DAY_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const precomputePlatformStatsTask = defineTask({
    name: "precompute-platform-stats" as const,
    visibility: "admin",
    description: "Pre-cache platform stats (overview and media types)",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const cacheManager = await getContainer().then((c) => c.cacheManager);

        await ctx.step("platform-stats-overview", async () => {
            const data = await getPlatformStatsData("overview");
            await cacheManager.set(getPlatformStatsCacheKey("overview"), data, ONE_DAY_CACHE_TTL_MS);
        });

        for (const mediaType of Object.values(MediaType)) {
            await ctx.step(`platform-stats-${mediaType}`, async () => {
                const data = await getPlatformStatsData(mediaType);
                await cacheManager.set(getPlatformStatsCacheKey(mediaType), data, ONE_DAY_CACHE_TTL_MS);
            });
        }
    },
});
