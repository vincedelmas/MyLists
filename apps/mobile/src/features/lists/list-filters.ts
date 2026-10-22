import type {ListInput} from "../../lib/api-client";
import {mediaListSearchSchema} from "@/lib/schemas/media-lists.schema";


export type ListFilters = Omit<ListInput, "page" | "search">;


const filterSchema = mediaListSearchSchema.omit({
    page: true,
    view: true,
    search: true,
    userId: true,
    perPage: true,
    filtersTab: true,
    currentUserId: true,
});


export function parseListFilters(value?: string): ListFilters {
    if (!value) return {};

    try {
        return filterSchema.parse(JSON.parse(value));
    }
    catch {
        return {};
    }
}


export function countListFilters(filters: ListFilters) {
    return Object.entries(filters).reduce((count, [key, value]) =>
        key === "sorting" ? count : count + (Array.isArray(value) ? value.length : value === true ? 1 : 0), 0);
}
