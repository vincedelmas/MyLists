import { mediaListSearchSchema } from "@/lib/schemas/media-lists.schema";
import type { ListInput } from "../../lib/api-client";

export type ListFilters = Omit<ListInput, "page" | "search">;

const filterSchema = mediaListSearchSchema.omit({
    page: true,
    perPage: true,
    search: true,
    userId: true,
    currentUserId: true,
    view: true,
    filtersTab: true,
});

export function parseListFilters(value?: string): ListFilters {
    if (!value) return {};
    try {
        return filterSchema.parse(JSON.parse(value));
    } catch {
        return {};
    }
}

export function countListFilters(filters: ListFilters) {
    return Object.entries(filters).reduce(
        (count, [key, value]) =>
            key === "sorting" ? count : count + (Array.isArray(value) ? value.length : value === true ? 1 : 0),
        0,
    );
}
