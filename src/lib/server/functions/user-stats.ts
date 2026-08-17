import {userStatsInputSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {AdvancedMediaStats} from "@/lib/types/stats.types";
import {InactiveMediaTypeError} from "@/lib/utils/error-classes";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {getUserStatsCacheKey, ONE_HOUR_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const getUserStats = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(userStatsInputSchema)
    .handler(async ({ data: { activeTab }, context: { user } }) => {
        const container = await getContainer();
        const statsService = container.services.stats;
        const activatedMediaTypes = user.userMediaSettings.filter(s => s.active).map(s => s.mediaType);

        if (activeTab !== "overview" && !activatedMediaTypes.includes(activeTab)) {
            throw new InactiveMediaTypeError(activeTab);
        }

        if (activeTab === "overview") {
            const stats = await container.cacheManager.wrap(
                getUserStatsCacheKey(user.id, activeTab),
                () => statsService.userAdvancedSummaryStats(user.id),
                { ttl: ONE_HOUR_CACHE_TTL_MS },
            );

            return {
                ...stats,
                mediaType: null,
                activatedMediaTypes,
                scope: "user" as const,
                kind: "overview" as const,
                ratingSystem: user.ratingSystem,
            };
        }

        const stats = await container.cacheManager.wrap(
            getUserStatsCacheKey(user.id, activeTab),
            () => statsService.userAdvancedMediaStats(user.id, activeTab),
            { ttl: ONE_HOUR_CACHE_TTL_MS },
        );

        return {
            ...stats,
            activatedMediaTypes,
            mediaType: activeTab,
            kind: "media" as const,
            scope: "user" as const,
            ratingSystem: user.ratingSystem,
        } as AdvancedMediaStats;
    });
