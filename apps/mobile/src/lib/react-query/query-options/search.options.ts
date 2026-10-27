import {api, type SearchInput} from "../../api-client";
import {infiniteQueryOptions} from "@tanstack/react-query";


export const searchOptions = (query: string, apiProvider: SearchInput["apiProvider"], advancedFilters?: SearchInput["advancedFilters"]) => infiniteQueryOptions({
    queryKey: ["search", apiProvider, query, advancedFilters],
    initialPageParam: 1,
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
    queryFn: ({ pageParam, signal }) => api.search({
        query,
        apiProvider,
        page: pageParam,
        advancedFilters
    }, signal),
    getNextPageParam: (page, _pages, lastPage) => (page.hasNextPage ? lastPage + 1 : undefined),
});
