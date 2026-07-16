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
    .handler(async ({ data: { activeTab }, context: { user, libraryAccessScope } }) => {
        const container = await getContainer();
        const userStatsService = container.services.userStats;
        const activatedMediaTypes = await container.features.profileChannelAccess.getEnabledKinds(user.id);

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
                activatedMediaTypes,
                mediaType: undefined,
                ratingSystem: user.ratingSystem,
            };
        }

        const stats = await container.cacheManager.wrap(
            getUserStatsCacheKey(user.id, activeTab),
            () => userStatsService.userAdvancedMediaStats(user.id, activeTab, {
                ...libraryAccessScope,
                mediaTypeEnabled: true,
            }),
            { ttl: ONE_HOUR_CACHE_TTL_MS },
        );

        return {
            ...stats,
            activatedMediaTypes,
            mediaType: activeTab,
            ratingSystem: user.ratingSystem,
        } as AdvancedMediaStats;
    });
