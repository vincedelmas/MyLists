import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {mediaBrowseFiltersSchema} from "@/lib/schemas/media-browse.schema";
import {mediaTagMatchingSchema} from "@/lib/schemas/media-filters.schema";
import {createMediaFiltersSchema, MAX_MEDIA_FILTER_VALUES, mediaRatingFilterSchema} from "@/lib/media-definitions/base/media-filters";
import {ALL_MEDIA_TYPES, getMediaDefinition, mediaCommonFilterSchemas} from "@/lib/media-definitions/definition.registry";


export type DynamicListSpec = z.infer<typeof dynamicListSpecSchema>;
export type DynamicListRuntimeFilters = z.infer<typeof dynamicListRuntimeFiltersSchema>;


export const dynamicListIdSchema = z.strictObject({ id: z.number().int().positive() });
const dynamicListStatusGroupSchema = z.enum(["planned", "in_progress", "completed", "on_hold", "dropped"]);
const relativeMonthsSchema = z.strictObject({ monthsAgo: z.number().int().min(1).max(120) });
const tagIdsSchema = z.array(z.number().int().positive()).max(MAX_MEDIA_FILTER_VALUES)
    .refine(ids => new Set(ids).size === ids.length, "Choose each tag once.");

const dynamicListTagRuleSchema = z.strictObject({
    tags: tagIdsSchema.optional(),
    tagsMatch: mediaTagMatchingSchema.optional(),
    excludeTags: tagIdsSchema.optional(),
});

export type DynamicListTagRule = z.infer<typeof dynamicListTagRuleSchema>;

const createDynamicListMediaFiltersSchema = <Type extends MediaType>(mediaType: Type) => {
    const { common, metadata } = getMediaDefinition(mediaType).filters;
    return createMediaFiltersSchema(metadata).extend(createMediaFiltersSchema({
        genres: common.genres,
        // Migrated lists can have both global and media-specific tag conditions.
        tagRules: z.array(dynamicListTagRuleSchema).max(2),
    }).shape);
};


export const dynamicListMediaFiltersSchema = z.strictObject(Object.fromEntries(
    ALL_MEDIA_TYPES.map(mediaType => [mediaType, createDynamicListMediaFiltersSchema(mediaType).optional()]),
) as {
    [Type in MediaType]: z.ZodOptional<ReturnType<typeof createDynamicListMediaFiltersSchema<Type>>>;
});


export const dynamicListSpecSchema = z.strictObject({
    version: z.literal(2),
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
        addedBefore: relativeMonthsSchema.optional(),
        addedWithin: relativeMonthsSchema.optional(),
        minRating: mediaRatingFilterSchema.optional(),
        maxRating: mediaRatingFilterSchema.optional(),
        updatedBefore: relativeMonthsSchema.optional(),
        mediaFilters: dynamicListMediaFiltersSchema.optional(),
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
