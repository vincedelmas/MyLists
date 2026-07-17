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
            return container.media.get(MediaType.SERIES).external.search.search(query, page);
        }

        if (apiProvider === ApiProviderType.IGDB) {
            return container.media.get(MediaType.GAMES).external.search.search(query, page);
        }

        if (apiProvider === ApiProviderType.MANGA) {
            return container.media.get(MediaType.MANGA).external.search.search(query, page);
        }

        if (apiProvider === ApiProviderType.BOOKS) {
            const apiResults = await container.media.get(MediaType.BOOKS).external.search.search(query, page);

            if (page === 1) {
                const dbResults = await container.media.get(MediaType.BOOKS).catalog.read.searchByName(query);

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
