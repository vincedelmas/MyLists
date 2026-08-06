import type {AdvancedSearchFilters} from "@/lib/schemas";


export const cleanAdvancedSearchText = (value?: string) => {
    return value?.trim() || undefined;
}


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


export const hasSearchCriteria = (query: string, filters?: AdvancedSearchFilters) => {
    return query.trim().length >= 2 || countAdvancedSearchFilters(filters) > 0;
};
