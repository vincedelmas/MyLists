import {statsActiveTabSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {getPlatformStatsData} from "@/lib/server/functions/platform-stats-data";
import {getPlatformStatsCacheKey, ONE_DAY_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const getPlatformStats = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(statsActiveTabSchema)
    .handler(async ({ data: { activeTab } }) => {
        const container = await getContainer();

        return container.cacheManager.wrap(
            getPlatformStatsCacheKey(activeTab),
            () => getPlatformStatsData(activeTab),
            { ttl: ONE_DAY_CACHE_TTL_MS },
        );
    });
