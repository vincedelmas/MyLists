import {MediaType} from "@/lib/utils/enums";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {ONE_DAY_CACHE_TTL_MS, TRENDS_CACHE_KEY} from "@/lib/server/core/cache-keys";


export const getTrendsMedia = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async () => {
        const container = await getContainer();

        return container.cacheManager.wrap(
            TRENDS_CACHE_KEY,
            async () => {
                const registry = container.registries.externalProviders;

                const gamesProvider = registry.get(MediaType.GAMES);
                const seriesProvider = registry.get(MediaType.SERIES);
                const moviesProvider = registry.get(MediaType.MOVIES);

                const [gamesTrends, seriesTrends, moviesTrends] = await Promise.all([
                    gamesProvider.getTrends?.() ?? [],
                    seriesProvider.getTrends?.() ?? [],
                    moviesProvider.getTrends?.() ?? [],
                ]);

                return { gamesTrends, seriesTrends, moviesTrends };
            },
            { ttl: ONE_DAY_CACHE_TTL_MS },
        );
    });
