import {MediaType, Status} from "@/lib/utils/enums";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";


export const DYNAMIC_LIST_PRESETS = [
    {
        version: 2,
        display: "grid",
        mediaTypes: "all",
        title: "Plans older than six months",
        sort: { field: "addedAt", direction: "asc" },
        filters: { statuses: [Status.PLANNED], addedBefore: { monthsAgo: 6 } },
    },
    {
        version: 2,
        display: "grid",
        mediaTypes: "all",
        filters: { favorite: true },
        title: "Your favorites, together",
        sort: { field: "rating", direction: "desc" },
    },
    {
        version: 2,
        display: "grid",
        mediaTypes: "all",
        title: "Finished and loved",
        sort: { field: "rating", direction: "desc" },
        filters: { statuses: [Status.COMPLETED], minRating: 8 },
    },
    {
        version: 2,
        display: "grid",
        mediaTypes: "all",
        title: "In progress",
        filters: { statuses: [Status.IN_PROGRESS] },
        sort: { field: "lastUpdated", direction: "desc" },
    },
    {
        version: 2,
        display: "grid",
        mediaTypes: "all",
        title: "Recently added",
        filters: { addedWithin: { monthsAgo: 1 } },
        sort: { field: "addedAt", direction: "desc" },
    },
    {
        version: 2,
        display: "list",
        mediaTypes: "all",
        title: "Waiting for your rating",
        sort: { field: "lastUpdated", direction: "desc" },
        filters: { statuses: [Status.COMPLETED], rated: false },
    },
    {
        version: 2,
        display: "list",
        mediaTypes: "all",
        title: "Paused for a while",
        sort: { field: "lastUpdated", direction: "asc" },
        filters: { statuses: [Status.ON_HOLD], updatedBefore: { monthsAgo: 3 } },
    },
    {
        version: 2,
        display: "grid",
        title: "Your reading queue",
        filters: { statuses: [Status.PLANNED] },
        sort: { field: "addedAt", direction: "asc" },
        mediaTypes: [MediaType.BOOKS, MediaType.MANGA],
    },
    {
        version: 2,
        display: "list",
        mediaTypes: "all",
        filters: { hasComment: true },
        title: "Your notes and reviews",
        sort: { field: "lastUpdated", direction: "desc" },
    },
] satisfies DynamicListSpec[];
