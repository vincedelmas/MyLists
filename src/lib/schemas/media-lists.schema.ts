import * as z from "zod";
import {JobType} from "@/lib/utils/enums";
import {createMediaFiltersSchema} from "@/lib/media-definitions/base/media-filters";
import {ALL_MEDIA_TYPES, getMediaDefinition, mediaCommonFilterSchemas, type MediaMetadataFilterKey, type MediaMetadataFilterSchemas} from "@/lib/media-definitions/definition.registry";
import {
    paginationSchema,
    sortingFieldSchema,
    usernameFieldSchema,
    mediaTypeFieldSchema,
    optionalCoercedBooleanFieldSchema,
} from "@/lib/schemas/common.schema";


export type MediaListArgs = z.infer<typeof mediaListArgsSchema>;


// Tracking-list URLs keep their existing unbounded arrays and ignore malformed values.
const mediaFilterSchemas = Object.fromEntries(
    ALL_MEDIA_TYPES.flatMap(mediaType => Object.entries(getMediaDefinition(mediaType).filters.metadata)),
) as MediaMetadataFilterSchemas;


const mediaListMetadataFiltersSchema = z.strictObject(Object.fromEntries(
    Object.entries(mediaFilterSchemas).map(([key, schema]) => {
        const valueSchema = schema.element;
        return [key, z.array(valueSchema instanceof z.ZodString ? z.string() : valueSchema).optional().catch(undefined)];
    }),
) as {
    [Key in MediaMetadataFilterKey]: z.ZodCatch<z.ZodOptional<z.ZodArray<MediaMetadataFilterSchemas[Key]["element"]>>>;
});


const mediaListCommonFiltersSchema = createMediaFiltersSchema(mediaCommonFilterSchemas).omit({ minRating: true }).extend({
    search: mediaCommonFilterSchemas.search.optional().catch(undefined),
    comment: z.coerce.boolean().pipe(mediaCommonFilterSchemas.comment).optional().catch(undefined),
    favorite: z.coerce.boolean().pipe(mediaCommonFilterSchemas.favorite).optional().catch(undefined),
    tags: z.array(z.string()).optional().catch(undefined),
    genres: z.array(z.string()).optional().catch(undefined),
    status: z.array(mediaCommonFilterSchemas.status).optional().catch(undefined),
});


const mediaListArgsSchema = paginationSchema.extend({
    ...mediaListCommonFiltersSchema.shape,
    sorting: sortingFieldSchema,
    hideCommon: optionalCoercedBooleanFieldSchema,
    userId: z.coerce.number().int().optional().catch(undefined),
    currentUserId: z.coerce.number().int().optional().catch(undefined),
    ...mediaListMetadataFiltersSchema.shape,
});

export const mediaListSearchSchema = mediaListArgsSchema.extend({
    view: z.enum(["grid", "list"]).optional().catch(undefined),
    filtersTab: z.enum(["filters", "tags"]).optional().catch(undefined),
});

export const mediaListSchema = z.object({
    args: mediaListArgsSchema,
    username: usernameFieldSchema,
    mediaType: mediaTypeFieldSchema,
});

export const mediaListFiltersSchema = z.looseObject({
    mediaType: mediaTypeFieldSchema,
});

export const mediaListSearchFiltersSchema = z.looseObject({
    job: z.enum(JobType),
    mediaType: mediaTypeFieldSchema,
    query: z.string().min(1),
});
