import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {mediaBrowseFiltersSchema} from "@/lib/schemas/media-browse.schema";
import {scopedMediaFiltersSchema} from "@/lib/schemas/media-filters.schema";
import {mediaRatingFilterSchema} from "@/lib/media-definitions/base/media-filters";
import {mediaCommonFilterSchemas} from "@/lib/media-definitions/definition.registry";


export type DynamicListSpec = z.infer<typeof dynamicListSpecSchema>;
export type DynamicListRuntimeFilters = z.infer<typeof dynamicListRuntimeFiltersSchema>;


export const dynamicListIdSchema = z.strictObject({ id: z.number().int().positive() });
const dynamicListStatusGroupSchema = z.enum(["planned", "in_progress", "completed", "on_hold", "dropped"]);
const relativeMonthsSchema = z.strictObject({ monthsAgo: z.number().int().min(1).max(120) });
const filterNamesSchema = mediaCommonFilterSchemas.tags.min(1);


export const dynamicListSpecSchema = z.strictObject({
    version: z.literal(1),
    display: z.enum(["grid", "list"]),
    title: z.string().trim().min(1).max(100),
    mediaTypes: z.union([
        z.literal("all"),
        z.array(z.enum(MediaType)).min(1).max(6)
            .refine(types => new Set(types).size === types.length, "Choose each media type once."),
    ]),
    sort: z.strictObject({
        direction: z.enum(["asc", "desc"]),
        field: z.enum(["addedAt", "lastUpdated", "title", "rating", "releaseDate"]),
    }),
    filters: z.strictObject({
        rated: z.boolean().optional(),
        tags: filterNamesSchema.optional(),
        excludeTags: filterNamesSchema.optional(),
        tagsMatch: z.enum(["any", "all"]).optional(),
        addedBefore: relativeMonthsSchema.optional(),
        addedWithin: relativeMonthsSchema.optional(),
        minRating: mediaRatingFilterSchema.optional(),
        maxRating: mediaRatingFilterSchema.optional(),
        updatedBefore: relativeMonthsSchema.optional(),
        mediaFilters: scopedMediaFiltersSchema.optional(),
        statusGroup: dynamicListStatusGroupSchema.optional(),
        favorite: mediaCommonFilterSchemas.favorite.optional(),
        hasComment: mediaCommonFilterSchemas.comment.optional(),
        genres: mediaCommonFilterSchemas.genres.min(1).optional(),
        minReleaseYear: z.number().int().min(1).max(9999).optional(),
        maxReleaseYear: z.number().int().min(1).max(9999).optional(),
        search: mediaCommonFilterSchemas.search.trim().min(1).max(100).optional(),
        statuses: z.array(mediaCommonFilterSchemas.status).min(1).max(12)
            .refine(statuses => new Set(statuses).size === statuses.length, "Choose each status once.").optional(),
    }).refine(filters => filters.minRating === undefined || filters.maxRating === undefined || filters.minRating <= filters.maxRating, {
        message: "Minimum rating cannot exceed maximum rating.", path: ["maxRating"],
    }).refine(filters => filters.minReleaseYear === undefined || filters.maxReleaseYear === undefined || filters.minReleaseYear <= filters.maxReleaseYear, {
        message: "First release year cannot exceed last release year.", path: ["maxReleaseYear"],
    }).refine(filters => !filters.addedBefore || !filters.addedWithin || filters.addedBefore.monthsAgo < filters.addedWithin.monthsAgo, {
        message: "The added-before age must be shorter than the added-within period.", path: ["addedWithin"],
    }),
});


const dynamicListPageSchema = z.strictObject({
    page: z.number().int().min(1).max(100_000).optional().default(1),
});


const dynamicListRuntimeFiltersSchema = mediaBrowseFiltersSchema.omit({ page: true }).extend({
    hideCommon: z.boolean().optional(),
});


export const dynamicListSearchSchema = dynamicListRuntimeFiltersSchema.extend(dynamicListPageSchema.shape).extend({
    view: z.enum(["grid", "table"]).optional(),
});


export const dynamicListPreviewSchema = dynamicListPageSchema.extend({ spec: dynamicListSpecSchema });


export const dynamicListDetailsSchema = dynamicListIdSchema.extend(dynamicListPageSchema.shape).extend({
    includeFilterOptions: z.boolean().optional(),
    filters: dynamicListRuntimeFiltersSchema.optional(),
});


export const dynamicListUpdateSchema = dynamicListIdSchema.extend({ spec: dynamicListSpecSchema });
