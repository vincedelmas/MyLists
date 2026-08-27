import {ApiProviderType} from "@/lib/utils/enums";
import type {AdvancedSearchFilters} from "@/lib/schemas/search.schema";
import {validateBookAdvancedSearch, validateGameAdvancedSearch} from "@/lib/schemas/search.schema";


export const toOptionalNumber = (value: string) => {
    return value === "" ? undefined : Number(value);
}


export const countAdvancedSearchFilters = (filters?: AdvancedSearchFilters) => {
    if (!filters) return 0;

    return Object.entries(filters).filter(([key, value]) => {
        if (key === "provider") return false;
        return value !== undefined && value !== null && value !== "";
    }).length;
};


export const hasSearchCriteria = (query: string, apiProvider: ApiProviderType, filters?: AdvancedSearchFilters) => {
    if (filters && filters.provider !== apiProvider) return false;

    if (apiProvider === ApiProviderType.BOOKS) {
        return validateBookAdvancedSearch(query, filters) === undefined;
    }

    if (apiProvider === ApiProviderType.IGDB) {
        return validateGameAdvancedSearch(query, filters) === undefined;
    }

    return query.trim().length >= 2;
};
