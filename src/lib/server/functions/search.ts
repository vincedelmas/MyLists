import {navbarSearchSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {publicAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {tmdbTransformer} from "@/lib/server/api-providers/transformers/tmdb.transformer";
import {igdbTransformer} from "@/lib/server/api-providers/transformers/igdb.transformer";
import {jikanTransformer} from "@/lib/server/api-providers/transformers/jikan.transformer";
import {gbooksTransformer} from "@/lib/server/api-providers/transformers/gbook.transformer";


export const getSearchResults = createServerFn({ method: "GET" })
    .middleware([publicAuthMiddleware])
    .inputValidator(navbarSearchSchema)
    .handler(async ({ data: { query, page, apiProvider }, context: { currentUser } }) => {
        const container = await getContainer();
        const igdbClient = container.clients.igdb;
        const tmdbClient = container.clients.tmdb;
        const gBookClient = container.clients.gBook;
        const jikanClient = container.clients.jikan;
        const userService = container.services.user;

        if (query === "") {
            return { hasNextPage: false, data: [] };
        }

        if (apiProvider === ApiProviderType.USERS) {
            return userService.searchUsers(query, page);
        }

        if (!currentUser) {
            throw new FormattedError("Log-in or register to search for media.");
        }

        if (apiProvider === ApiProviderType.TMDB) {
            const rawResults = await tmdbClient.search(query, page);
            return tmdbTransformer.transformSearchResults(rawResults);
        }

        if (apiProvider === ApiProviderType.IGDB) {
            const rawResults = await igdbClient.search(query, page);
            return igdbTransformer.transformSearchResults(rawResults);
        }

        if (apiProvider === ApiProviderType.BOOKS) {
            const rawResults = await gBookClient.search(query, page);
            const apiResults = gbooksTransformer.transformSearchResults(rawResults);

            if (page === 1) {
                const booksService = container.registries.mediaService.getService(MediaType.BOOKS);
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
        else {
            const rawResults = await jikanClient.search(query, page);
            return jikanTransformer.transformSearchResults(rawResults);
        }
    });
