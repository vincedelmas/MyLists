import {navbarSearchSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {ProviderSearchResult, ProviderSearchResults} from "@/lib/types/provider.types";
import {IGDB_ADVANCED_SEARCH_OPTIONS_CACHE_KEY, ONE_DAY_CACHE_TTL_MS} from "@/lib/server/core/cache-keys";


export const getGameAdvancedSearchOptions = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
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
    .middleware([publicAuthMiddleware])
    .validator(navbarSearchSchema)
    .handler(async ({ data: { query, page, apiProvider, advancedFilters }, context: { currentUser } }) => {
        const container = await getContainer();
        const profileService = container.services.profile;
        const providers = container.registries.externalProviders;

        if (advancedFilters && advancedFilters.provider !== apiProvider) {
            throw new FormattedError("The advanced filters do not match the selected search provider.");
        }

        if (query === "" && !advancedFilters) {
            return { hasNextPage: false, data: [] };
        }

        if (apiProvider === ApiProviderType.USERS) {
            return profileService.searchUsers(query, page, currentUser?.id);
        }

        if (!currentUser) {
            throw new FormattedError("Log-in or register to search for media.");
        }

        let searchResults: ProviderSearchResults;

        if (apiProvider === ApiProviderType.TMDB) {
            searchResults = await providers.get(MediaType.SERIES).search(query, page);
        }
        else if (apiProvider === ApiProviderType.IGDB) {
            searchResults = await providers.get(MediaType.GAMES).search(query, page, advancedFilters);
        }
        else if (apiProvider === ApiProviderType.MANGA) {
            searchResults = await providers.get(MediaType.MANGA).search(query, page);
        }
        else if (apiProvider === ApiProviderType.BOOKS) {
            const apiResults = await providers.get(MediaType.BOOKS).search(query, page, advancedFilters);
            if (!advancedFilters && page === 1) {
                const booksService = container.registries.mediaService.get(MediaType.BOOKS);
                const dbResults = await booksService.searchByName(query);

                const dbApiIds = new Set(dbResults.map((r) => String(r.id)));
                const filteredApiResults = apiResults.data.filter((r) => !dbApiIds.has(String(r.id)));

                searchResults = {
                    hasNextPage: apiResults.hasNextPage,
                    data: [...dbResults, ...filteredApiResults],
                };
            }
            else {
                searchResults = apiResults;
            }
        }
        else {
            throw new FormattedError("Unsupported search provider.");
        }

        const itemsByMediaType = new Map<MediaType, ProviderSearchResult[]>();
        searchResults.data.forEach((item) => {
            const mediaType = item.itemType as MediaType;
            const mediaItems = itemsByMediaType.get(mediaType);
            if (mediaItems) mediaItems.push(item);
            else itemsByMediaType.set(mediaType, [item]);
        });
        const membershipByItem = new Map<string, { mediaId: number; inCurrentUserList: boolean }>();

        await Promise.all([...itemsByMediaType.entries()].map(async ([mediaType, items]) => {
            const mediaService = container.registries.mediaService.get(mediaType);
            const storedMedia = await mediaService.findByApiIds(items.map(({ id }) => id));
            const userMediaIds = new Set(await mediaService.findUserMediaIds(currentUser.id, storedMedia.map(({ id }) => id)));

            storedMedia.forEach(({ id, apiId }) => {
                membershipByItem.set(`${mediaType}:${apiId}`, {
                    mediaId: id,
                    inCurrentUserList: userMediaIds.has(id),
                });
            });
        }));

        return {
            ...searchResults,
            data: searchResults.data.map((item) => ({
                ...item,
                ...membershipByItem.get(`${item.itemType}:${item.id}`),
            })),
        };
    });
