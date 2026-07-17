import {navbarSearchSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const getSearchResults = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .validator(navbarSearchSchema)
    .handler(async ({ data: { query, page, apiProvider }, context: { currentUser } }) => {
        const container = await getContainer();
        const providers = container.catalog.externalProviders;

        if (query === "") {
            return { hasNextPage: false, data: [] };
        }

        if (apiProvider === ApiProviderType.USERS) {
            return container.account.query.search(query, page);
        }

        if (!currentUser) {
            throw new FormattedError("Log-in or register to search for media.");
        }

        if (apiProvider === ApiProviderType.TMDB) {
            return providers.get(MediaType.SERIES).search.search(query, page);
        }

        if (apiProvider === ApiProviderType.IGDB) {
            return providers.get(MediaType.GAMES).search.search(query, page);
        }

        if (apiProvider === ApiProviderType.MANGA) {
            return providers.get(MediaType.MANGA).search.search(query, page);
        }

        if (apiProvider === ApiProviderType.BOOKS) {
            const apiResults = await providers.get(MediaType.BOOKS).search.search(query, page);

            if (page === 1) {
                const dbResults = await container.media.catalog.readers[MediaType.BOOKS].searchByName(query);

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
