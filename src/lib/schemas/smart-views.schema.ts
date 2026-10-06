import * as z from "zod";
import {MediaType, Status} from "@/lib/utils/enums";
import {mediaBrowseFiltersSchema} from "@/lib/schemas/media-browse.schema";


export const MAX_SMART_VIEW_FILTER_NAMES = 20;


export type SmartViewSpec = z.infer<typeof smartViewSpecSchema>;


export const smartViewIdSchema = z.strictObject({ id: z.number().int().positive() });
const smartViewStatusGroupSchema = z.enum(["planned", "in_progress", "completed", "on_hold", "dropped"]);
const relativeMonthsSchema = z.strictObject({ monthsAgo: z.number().int().min(1).max(120) });
const filterNamesSchema = z.array(z.string().trim().min(1).max(100)).min(1).max(MAX_SMART_VIEW_FILTER_NAMES);


export const smartViewSpecSchema = z.strictObject({
    version: z.literal(1),
    display: z.enum(["grid", "list"]),
    title: z.string().trim().min(1).max(100),
    mediaTypes: z.union([
        z.literal("all"),
        z.array(z.enum(MediaType)).min(1).max(6).refine(types => new Set(types).size === types.length, "Choose each media type once."),
    ]),
    sort: z.strictObject({
        direction: z.enum(["asc", "desc"]),
        field: z.enum(["addedAt", "lastUpdated", "title", "rating", "releaseDate"]),
    }),
    filters: z.strictObject({
        rated: z.boolean().optional(),
        favorite: z.boolean().optional(),
        hasComment: z.boolean().optional(),
        tags: filterNamesSchema.optional(),
        genres: filterNamesSchema.optional(),
        excludeTags: filterNamesSchema.optional(),
        tagsMatch: z.enum(["any", "all"]).optional(),
        addedBefore: relativeMonthsSchema.optional(),
        addedWithin: relativeMonthsSchema.optional(),
        updatedBefore: relativeMonthsSchema.optional(),
        statusGroup: smartViewStatusGroupSchema.optional(),
        minRating: z.number().min(0).max(10).optional(),
        maxRating: z.number().min(0).max(10).optional(),
        search: z.string().trim().min(1).max(100).optional(),
        minReleaseYear: z.number().int().min(1).max(9999).optional(),
        maxReleaseYear: z.number().int().min(1).max(9999).optional(),
        statuses: z.array(z.enum(Status)).min(1).max(12)
            .refine(statuses => new Set(statuses).size === statuses.length, "Choose each status once.").optional(),
    }).refine(filters => filters.minRating === undefined || filters.maxRating === undefined || filters.minRating <= filters.maxRating, {
        message: "Minimum rating cannot exceed maximum rating.", path: ["maxRating"],
    }).refine(filters => filters.minReleaseYear === undefined || filters.maxReleaseYear === undefined || filters.minReleaseYear <= filters.maxReleaseYear, {
        message: "First release year cannot exceed last release year.", path: ["maxReleaseYear"],
    }).refine(filters => !filters.addedBefore || !filters.addedWithin || filters.addedBefore.monthsAgo < filters.addedWithin.monthsAgo, {
        message: "The added-before age must be shorter than the added-within period.", path: ["addedWithin"],
    }),
});


const smartViewPageSchema = z.strictObject({
    page: z.number().int().min(1).max(100_000).optional().default(1),
});


export const smartViewSearchSchema = mediaBrowseFiltersSchema.extend(smartViewPageSchema.shape).extend({
    view: z.enum(["grid", "table"]).optional(),
});


export const smartViewPreviewSchema = smartViewPageSchema.extend({ spec: smartViewSpecSchema });


export const smartViewDetailsSchema = smartViewIdSchema.extend(smartViewPageSchema.shape).extend({
    filters: mediaBrowseFiltersSchema.omit({ page: true }).optional(),
});


export const smartViewUpdateSchema = smartViewIdSchema.extend({ spec: smartViewSpecSchema });
