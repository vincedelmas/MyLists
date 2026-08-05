import {ApiProviderType} from "@/lib/utils/enums";
import {queryOptions} from "@tanstack/react-query";
import {AdvancedSearchFilters} from "@/lib/schemas";
import {getGameAdvancedSearchOptions, getSearchResults} from "@/lib/server/functions/search";


export const navSearchOptions = (query: string, page: number, apiProvider: ApiProviderType, advancedFilters?: AdvancedSearchFilters) => {
    const trimmedQuery = query.trim();

    return queryOptions({
        queryKey: ["navSearch", trimmedQuery, page, apiProvider, advancedFilters],
        queryFn: () => getSearchResults({ data: { query: trimmedQuery, page, apiProvider, advancedFilters } }),
        staleTime: 1000 * 60 * 2,
        enabled: trimmedQuery.length >= 2 || advancedFilters !== undefined,
    });
};


export const gameAdvancedSearchOptions = () => queryOptions({
    queryKey: ["advancedSearchOptions", ApiProviderType.IGDB],
    queryFn: () => getGameAdvancedSearchOptions(),
    staleTime: 1000 * 60 * 60 * 24,
});
