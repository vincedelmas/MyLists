import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {ONE_DAY_CACHE_TTL_MS, TRENDS_CACHE_KEY} from "@/lib/server/core/cache-keys";

export const getTrendsMediaData = async () => {
    const container = await getContainer();
    return container.cacheManager.wrap(TRENDS_CACHE_KEY, async () => {
        const registry = container.registries.externalProviders;
        const [seriesTrends, moviesTrends, gamesTrends] = await Promise.all([
            registry.get(MediaType.SERIES).getTrends?.() ?? [],
            registry.get(MediaType.MOVIES).getTrends?.() ?? [],
            registry.get(MediaType.GAMES).getTrends?.() ?? [],
        ]);
        return { seriesTrends, moviesTrends, gamesTrends };
    }, { ttl: ONE_DAY_CACHE_TTL_MS });
};
