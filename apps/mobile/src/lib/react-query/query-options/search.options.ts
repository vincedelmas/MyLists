import {infiniteQueryOptions} from "@tanstack/react-query";
import {api, type SearchInput} from "../../api-client";

export const searchOptions = (query: string, apiProvider: SearchInput["apiProvider"]) =>
    infiniteQueryOptions({
        queryKey: ["search", apiProvider, query],
        initialPageParam: 1,
        enabled: query.trim().length >= 2,
        staleTime: 60_000,
        queryFn: ({pageParam, signal}) => api.search({query, apiProvider, page: pageParam}, signal),
        getNextPageParam: (page, _pages, lastPage) => (page.hasNextPage ? lastPage + 1 : undefined),
    });
