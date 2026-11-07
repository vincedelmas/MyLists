import * as z from "zod";
import {MediaType, Status} from "@/lib/utils/enums";
import {mediaTagMatchingSchema} from "@/lib/schemas/media-filters.schema";
import {mediaBrowseFiltersSchema} from "@/lib/schemas/media-browse.schema";
import {ALL_MEDIA_TYPES, getMediaDefinition, mediaCommonFilterSchemas} from "@/lib/media-definitions/definition.registry";
import {createMediaFiltersSchema, MAX_MEDIA_FILTER_VALUES, mediaRatingFilterSchema} from "@/lib/media-definitions/base/media-filters";


export type DynamicListSpec = z.infer<typeof dynamicListSpecSchema>;
export type DynamicListTagRule = z.infer<typeof dynamicListTagRuleSchema>;
export type DynamicListRuntimeFilters = z.infer<typeof dynamicListRuntimeFiltersSchema>;


export const dynamicListIdSchema = z.strictObject({ id: z.number().int().positive() });


const relativeMonthsSchema = z.strictObject({
    monthsAgo: z.number().int().min(1).max(120)
        .describe("Rolling UTC calendar-month cutoff with month ends clamped; unknown dates are excluded."),
});


const tagIdsSchema = z.array(z.number().int().positive()).max(MAX_MEDIA_FILTER_VALUES)
    .refine(ids => new Set(ids).size === ids.length, "Choose each tag once.");


const dynamicListTagRuleSchema = z.strictObject({
    tags: tagIdsSchema.optional(),
    excludeTags: tagIdsSchema.optional(),
    tagsMatch: mediaTagMatchingSchema.optional().describe("any (default) matches any included tag; all requires every included tag."),
});


const createDynamicListMediaFiltersSchema = <Type extends MediaType>(mediaType: Type) => {
    const { common, metadata } = getMediaDefinition(mediaType).filters;

    return createMediaFiltersSchema(metadata).extend(createMediaFiltersSchema({
        genres: common.genres,
        tagRules: z.array(dynamicListTagRuleSchema).max(2)
            .describe("Independent tag conditions combined with AND; tags and excludeTags contain tag IDs."),
    }).shape);
};


export const dynamicListMediaFiltersSchema = z.strictObject(
    Object.fromEntries(
        ALL_MEDIA_TYPES.map(mediaType => [mediaType, createDynamicListMediaFiltersSchema(mediaType).optional()]),
    ) as { [Type in MediaType]: z.ZodOptional<ReturnType<typeof createDynamicListMediaFiltersSchema<Type>>> }
);


export const dynamicListSpecSchema = z.strictObject({
    version: z.literal(2),
    display: z.enum(["grid", "list"]),
    title: z.string().trim().min(1).max(100),
    sort: z.strictObject({
        direction: z.enum(["asc", "desc"]),
        field: z.enum(["addedAt", "lastUpdated", "title", "rating", "releaseDate"]),
    }),
    mediaTypes: z.union([
        z.literal("all"),
        z.array(z.enum(MediaType)).min(1).max(6)
            .refine(types => new Set(types).size === types.length, "Choose each media type once."),
    ]),
    filters: z.strictObject({
        minRating: mediaRatingFilterSchema.optional(),
        maxRating: mediaRatingFilterSchema.optional(),
        favorite: mediaCommonFilterSchemas.favorite.optional(),
        genres: mediaCommonFilterSchemas.genres.min(1).optional(),
        updatedBefore: relativeMonthsSchema.optional().describe("Last updated before the cutoff."),
        rated: z.boolean().optional().describe("Whether a user rating is set; zero counts as rated."),
        hasComment: mediaCommonFilterSchemas.comment.optional().describe("Whether the entry has a nonblank user comment."),
        addedBefore: relativeMonthsSchema.optional().describe("Added before the cutoff, regardless of time spent in the current status."),
        addedWithin: relativeMonthsSchema.optional().describe("Added at or after the cutoff, regardless of time spent in the current status."),
        minReleaseYear: z.number().int().min(1).max(9999).optional().describe("Inclusive lower release-year bound; unknown release dates are excluded."),
        maxReleaseYear: z.number().int().min(1).max(9999).optional().describe("Inclusive upper release-year bound; unknown release dates are excluded."),
        search: mediaCommonFilterSchemas.search.trim().min(1).max(100).optional().describe("Case-insensitive literal substring of the catalog title."),
        mediaFilters: dynamicListMediaFiltersSchema.optional().describe("Series/anime langs are origin-country codes. Games platforms refer to the user's tracked platform."),
        statuses: z.array(mediaCommonFilterSchemas.status).max(Object.keys(Status).length)
            .refine(statuses => new Set(statuses).size === statuses.length, "Choose each status once.")
            .describe("Match any selected status; omit for any status, or use an empty array to match none.").optional(),
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


export const dynamicListDetailsSchema = dynamicListIdSchema.extend(dynamicListPageSchema.shape).extend({
    includeFilterOptions: z.boolean().optional(),
    filters: dynamicListRuntimeFiltersSchema.optional(),
});


export const dynamicListUpdateSchema = dynamicListIdSchema.extend({ spec: dynamicListSpecSchema });


export const dynamicListPreviewSchema = dynamicListPageSchema.extend({ spec: dynamicListSpecSchema });
