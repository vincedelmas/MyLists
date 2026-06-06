import {platformStatsSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {tryNotFound} from "@/lib/utils/try-not-found";
import {getContainer} from "@/lib/server/core/container";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {getPlatformStatsData} from "@/lib/server/functions/platform-stats-data";
import {getPlatformStatsCacheKey, ONE_DAY_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const getPlatformStats = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .inputValidator(tryNotFound(platformStatsSchema))
    .handler(async ({ data: { mediaType } }) => {
        const container = await getContainer();

        return container.cacheManager.wrap(
            getPlatformStatsCacheKey({ mediaType }),
            () => getPlatformStatsData(mediaType),
            { ttl: ONE_DAY_CACHE_TTL_MS },
        );
    });
