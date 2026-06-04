import {queryOptions} from "@tanstack/react-query";
import {ApiProviderType} from "@/lib/utils/enums";
import {getSearchResults} from "@/lib/server/functions/search";


export const navSearchOptions = (query: string, page: number, apiProvider: ApiProviderType) => {
    const trimmedQuery = query.trim();
    return queryOptions({
        queryKey: ["navSearch", trimmedQuery, page, apiProvider],
        queryFn: () => getSearchResults({ data: { query: trimmedQuery, page, apiProvider } }),
        staleTime: 1000 * 60 * 2,
        enabled: trimmedQuery.length >= 2,
    });
};
