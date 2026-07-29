import {userStatsInputSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {AdvancedMediaStats} from "@/lib/types/stats.types";
import {getUserStatsCacheKey, ONE_HOUR_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";
import {contentAuthorizationMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserStats = createServerFn({ method: "GET" })
    .middleware([contentAuthorizationMiddleware])
    .validator(userStatsInputSchema)
    .handler(async ({ data: { activeTab }, context: { user } }) => {
        const container = await getContainer();
        const userStatsService = container.services.userStats;
        const activatedMediaTypes = user.userMediaSettings
            .filter(s => s.active)
            .map(s => s.mediaType);

        if (activeTab !== "overview" && !activatedMediaTypes.includes(activeTab)) {
            throw new FormattedError("MediaType not activated");
        }

        if (activeTab === "overview") {
            const stats = await container.cacheManager.wrap(
                getUserStatsCacheKey(user.id, activeTab),
                () => userStatsService.userAdvancedSummaryStats(user.id),
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
            () => userStatsService.userAdvancedMediaStats(user.id, activeTab),
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
