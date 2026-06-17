import {userStatsInputSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {AdvancedMediaStats} from "@/lib/types/stats.types";
import {authorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {getUserStatsCacheKey, ONE_HOUR_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const getUserStats = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(userStatsInputSchema)
    .handler(async ({ data: { activeTab }, context: { user } }) => {
        const container = await getContainer();
        const userStatsService = container.services.userStats;
        const activatedMediaTypes = user.userMediaSettings
            .filter(s => s.active)
            .map(s => s.mediaType);

        return container.cacheManager.wrap(
            getUserStatsCacheKey(user.id, activeTab), async () => {
                if (activeTab === "overview") {
                    const userStats = await userStatsService.userAdvancedSummaryStats(user.id);
                    return {
                        ...userStats,
                        activatedMediaTypes,
                        mediaType: undefined,
                        ratingSystem: user.ratingSystem,
                    };
                }

                if (user.userMediaSettings.find((s) => s.mediaType === activeTab)?.active === false) {
                    throw new FormattedError("MediaType not activated");
                }

                const mediaStats = await userStatsService.userAdvancedMediaStats(user.id, activeTab);
                return {
                    ...mediaStats,
                    activatedMediaTypes,
                    mediaType: activeTab,
                    ratingSystem: user.ratingSystem,
                } as AdvancedMediaStats;
            },
            { ttl: ONE_HOUR_CACHE_TTL_MS },
        );
    });
