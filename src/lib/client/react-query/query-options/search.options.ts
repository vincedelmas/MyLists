import {queryOptions} from "@tanstack/react-query";
import {ApiProviderType} from "@/lib/utils/enums";
import {getSearchResults} from "@/lib/server/functions/search";
import {viewerScopedKey} from "@/lib/client/react-query/query-options/viewer-cache";


export const navSearchOptions = (query: string, page: number, apiProvider: ApiProviderType) => {
    const trimmedQuery = query.trim();
    return queryOptions({
        queryKey: viewerScopedKey(["navSearch", trimmedQuery, page, apiProvider]),
        queryFn: () => getSearchResults({ data: { query: trimmedQuery, page, apiProvider } }),
        staleTime: 1000 * 60 * 2,
        enabled: trimmedQuery.length >= 2,
    });
};
