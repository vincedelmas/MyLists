import {MediaType} from "@/lib/utils/enums";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";


export const DYNAMIC_LIST_PRESETS = [
    {
        version: 1,
        display: "grid",
        mediaTypes: "all",
        title: "Plans older than six months",
        sort: { field: "addedAt", direction: "asc" },
        filters: { statusGroup: "planned", addedBefore: { monthsAgo: 6 } },
    },
    {
        version: 1,
        display: "grid",
        mediaTypes: "all",
        filters: { favorite: true },
        title: "Your favorites, together",
        sort: { field: "rating", direction: "desc" },
    },
    {
        version: 1,
        display: "grid",
        mediaTypes: "all",
        title: "Finished and loved",
        sort: { field: "rating", direction: "desc" },
        filters: { statusGroup: "completed", minRating: 8 },
    },
    {
        version: 1,
        display: "grid",
        mediaTypes: "all",
        title: "In progress",
        filters: { statusGroup: "in_progress" },
        sort: { field: "lastUpdated", direction: "desc" },
    },
    {
        version: 1,
        display: "grid",
        mediaTypes: "all",
        title: "Recently added",
        filters: { addedWithin: { monthsAgo: 1 } },
        sort: { field: "addedAt", direction: "desc" },
    },
    {
        version: 1,
        display: "list",
        mediaTypes: "all",
        title: "Waiting for your rating",
        sort: { field: "lastUpdated", direction: "desc" },
        filters: { statusGroup: "completed", rated: false },
    },
    {
        version: 1,
        display: "list",
        mediaTypes: "all",
        title: "Paused for a while",
        sort: { field: "lastUpdated", direction: "asc" },
        filters: { statusGroup: "on_hold", updatedBefore: { monthsAgo: 3 } },
    },
    {
        version: 1,
        display: "grid",
        title: "Your reading queue",
        filters: { statusGroup: "planned" },
        sort: { field: "addedAt", direction: "asc" },
        mediaTypes: [MediaType.BOOKS, MediaType.MANGA],
    },
    {
        version: 1,
        display: "list",
        mediaTypes: "all",
        filters: { hasComment: true },
        title: "Your notes and reviews",
        sort: { field: "lastUpdated", direction: "desc" },
    },
] satisfies DynamicListSpec[];
