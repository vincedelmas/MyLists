import {ApiProviderType} from "@/lib/utils/enums";
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
        if (filters.provider === ApiProviderType.TMDB && key === "mediaType") return true;
        return value !== undefined && value !== null && value !== "";
    }).length;
};
