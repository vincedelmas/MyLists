import {navbarSearchSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {IGDB_ADVANCED_SEARCH_OPTIONS_CACHE_KEY, ONE_DAY_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const getGameAdvancedSearchOptions = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .handler(async () => {
        const container = await getContainer();
        const gameProvider = container.registries.externalProviders.get(MediaType.GAMES);

        if (!gameProvider.search.getAdvancedOptions) {
            throw new FormattedError("Advanced game search options are unavailable.");
        }

        return container.cacheManager.wrap(
            IGDB_ADVANCED_SEARCH_OPTIONS_CACHE_KEY,
            () => gameProvider.search.getAdvancedOptions!(),
            { ttl: ONE_DAY_CACHE_TTL_MS },
        );
    });


export const getSearchResults = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(navbarSearchSchema)
    .handler(async ({ data: { query, page, apiProvider, advancedFilters }, context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        const providers = container.registries.externalProviders;

        if (advancedFilters && advancedFilters.provider !== apiProvider) {
            throw new FormattedError("The advanced filters do not match the selected search provider.");
        }

        if (query === "" && !advancedFilters) {
            return { hasNextPage: false, data: [] };
        }

        if (apiProvider === ApiProviderType.USERS) {
            return userService.searchUsers(query, page);
        }

        if (!currentUser) {
            throw new FormattedError("Log-in or register to search for media.");
        }

        if (apiProvider === ApiProviderType.TMDB) {
            return providers.get(MediaType.SERIES).search.search(query, page, advancedFilters);
        }

        if (apiProvider === ApiProviderType.IGDB) {
            return providers.get(MediaType.GAMES).search.search(query, page, advancedFilters);
        }

        if (apiProvider === ApiProviderType.MANGA) {
            return providers.get(MediaType.MANGA).search.search(query, page);
        }

        if (apiProvider === ApiProviderType.BOOKS) {
            const apiResults = await providers.get(MediaType.BOOKS).search.search(query, page, advancedFilters);
            if (advancedFilters) return apiResults;

            if (page === 1) {
                const booksService = container.registries.mediaService.get(MediaType.BOOKS);
                const dbResults = await booksService.searchByName(query);

                const dbApiIds = new Set(dbResults.map((r) => String(r.id)));
                const filteredApiResults = apiResults.data.filter((r) => !dbApiIds.has(String(r.id)));

                return {
                    hasNextPage: apiResults.hasNextPage,
                    data: [...dbResults, ...filteredApiResults],
                };
            }

            return apiResults;
        }
    });
