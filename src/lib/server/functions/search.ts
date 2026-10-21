import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType} from "@/lib/utils/enums";
import {navbarSearchSchema} from "@/lib/schemas/search.schema";
import {searchCatalog} from "@/lib/server/domain/search/catalog-search";
import {optionalMediaAuthMiddleware} from "@/lib/server/middlewares/media-authentication";
import {IGDB_ADVANCED_SEARCH_OPTIONS_CACHE_KEY, ONE_DAY_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const getGameAdvancedSearchOptions = createServerFn({ method: "GET" })
    .middleware([optionalMediaAuthMiddleware])
    .handler(async () => {
        const container = await getContainer();
        const gameProvider = container.registries.externalProviders.get(MediaType.GAMES);

        if (!gameProvider.getAdvancedOptions) {
            throw new FormattedError("Advanced game search options are unavailable.");
        }

        return container.cacheManager.wrap(
            IGDB_ADVANCED_SEARCH_OPTIONS_CACHE_KEY,
            () => gameProvider.getAdvancedOptions!(),
            { ttl: ONE_DAY_CACHE_TTL_MS },
        );
    });


export const getSearchResults = createServerFn({ method: "GET" })
    .middleware([optionalMediaAuthMiddleware])
    .validator(navbarSearchSchema)
    .handler(({ data, context: { currentUser } }) => {
        return searchCatalog(data, currentUser?.id);
    });
