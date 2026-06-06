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
                const mediaProviderRegistry = container.registries.mediaProviderService;
                const gamesProviderService = mediaProviderRegistry.getService(MediaType.GAMES);
                const seriesProviderService = mediaProviderRegistry.getService(MediaType.SERIES);
                const moviesProviderService = mediaProviderRegistry.getService(MediaType.MOVIES);

                const gamesTrends = await gamesProviderService.fetchAndFormatTrends();
                const seriesTrends = await seriesProviderService.fetchAndFormatTrends();
                const moviesTrends = await moviesProviderService.fetchAndFormatTrends();

                return { seriesTrends, moviesTrends, gamesTrends };
            },
            { ttl: ONE_DAY_CACHE_TTL_MS },
        );
    });
