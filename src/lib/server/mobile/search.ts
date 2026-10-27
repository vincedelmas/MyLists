import {getContainer} from "@/lib/server/core/container";
import {IGDB_ADVANCED_SEARCH_OPTIONS_CACHE_KEY, ONE_DAY_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";
import {FormattedError} from "@/lib/utils/error-classes";

export async function getMobileGameSearchOptions() {
    const { registries, cacheManager } = await getContainer();
    const provider = registries.externalProviders.get("games");
    if (!provider.getAdvancedOptions) throw new FormattedError("Advanced game search options are unavailable.");
    return cacheManager.wrap(IGDB_ADVANCED_SEARCH_OPTIONS_CACHE_KEY, () => provider.getAdvancedOptions!(), { ttl: ONE_DAY_CACHE_TTL_MS });
}
