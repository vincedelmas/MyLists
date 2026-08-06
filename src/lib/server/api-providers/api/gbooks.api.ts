import {serverEnv} from "@/env/server";
import {BookAdvancedSearchFilters} from "@/lib/schemas";
import {GBooksDetails, GBooksSearchResults, SearchData} from "@/lib/types/provider.types";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";


type GBooksApiConfig = ApiClientConfig & {
    baseUrl: string;
};


const createConfig = (): GBooksApiConfig => ({
    resultsPerPage: 20,
    consumeKey: "gBooks-API",
    baseUrl: "https://www.googleapis.com/books/v1/volumes",
    throttleOptions: [{
        points: 4,
        duration: 1,
        keyPrefix: "gBooksAPI",
    }],
});


export const createGBooksApi = async () => {
    const config = createConfig();
    const http = await createApiHttpClient(config);
    const resultsPerPage = config.resultsPerPage ?? 20;

    return {
        async search(query: string, page: number = 1, advancedFilters?: BookAdvancedSearchFilters): Promise<SearchData<GBooksSearchResults>> {
            const advancedQueryParts = advancedFilters
                ? [
                    toFieldQuery("intitle", query),
                    toFieldQuery("inauthor", advancedFilters.author),
                    toFieldQuery("subject", advancedFilters.subject),
                    toFieldQuery("inpublisher", advancedFilters.publisher),
                    toFieldQuery("isbn", advancedFilters.isbn?.replace(/[\s-]/g, "")),
                ].filter(Boolean)
                : [];

            const params = new URLSearchParams({
                maxResults: resultsPerPage.toString(),
                q: advancedQueryParts.join(" ") || query,
                startIndex: ((page - 1) * resultsPerPage).toString(),
            });

            if (advancedFilters?.orderBy) params.set("orderBy", advancedFilters.orderBy);
            if (advancedFilters?.printType) params.set("printType", advancedFilters.printType);
            if (advancedFilters?.language) params.set("langRestrict", advancedFilters.language);
            if (advancedFilters?.availability) params.set("filter", advancedFilters.availability);

            const apiKey = serverEnv.GOOGLE_BOOKS_API_KEY;
            if (apiKey) params.set("key", apiKey);

            const response = await http.call(`${config.baseUrl}?${params.toString()}`);
            return {
                page,
                resultsPerPage,
                rawData: await response.json(),
            };
        },

        async getBooksDetails(bookApiId: string): Promise<GBooksDetails> {
            const url = new URL(`${config.baseUrl}/${bookApiId}`);

            const apiKey = serverEnv.GOOGLE_BOOKS_API_KEY;
            if (apiKey) url.searchParams.set("key", apiKey);

            const response = await http.call(url.toString());
            return response.json();
        },
    };
};


const toFieldQuery = (field: string, value?: string) => {
    const newValue = value?.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
    if (!newValue) return undefined;
    return newValue.includes(" ") ? `${field}:"${newValue}"` : `${field}:${newValue}`;
};


export type GBooksApi = Awaited<ReturnType<typeof createGBooksApi>>;
