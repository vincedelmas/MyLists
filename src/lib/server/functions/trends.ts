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
                const gamesProvider = container.media.get(MediaType.GAMES).external;
                const seriesProvider = container.media.get(MediaType.SERIES).external;
                const moviesProvider = container.media.get(MediaType.MOVIES).external;

                const gamesTrends = await gamesProvider.trends?.getTrends() ?? [];
                const seriesTrends = await seriesProvider.trends?.getTrends() ?? [];
                const moviesTrends = await moviesProvider.trends?.getTrends() ?? [];

                return { seriesTrends, moviesTrends, gamesTrends };
            },
            { ttl: ONE_DAY_CACHE_TTL_MS },
        );
    });
