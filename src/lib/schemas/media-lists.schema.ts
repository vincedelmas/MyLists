import * as z from "zod";
import {GamesPlatformsEnum, JobType, Status} from "@/lib/utils/enums";
import {
    mediaTypeFieldSchema,
    optionalCoercedBooleanFieldSchema,
    optionalSearchFieldSchema,
    paginationSchema,
    sortingFieldSchema,
    usernameFieldSchema
} from "@/lib/schemas/common.schema";


export type MediaListArgs = z.infer<typeof mediaListArgsSchema>;


const mediaListArgsSchema = paginationSchema.extend({
    sorting: sortingFieldSchema,
    search: optionalSearchFieldSchema,
    comment: optionalCoercedBooleanFieldSchema,
    favorite: optionalCoercedBooleanFieldSchema,
    hideCommon: optionalCoercedBooleanFieldSchema,
    status: z.array(z.enum(Status)).optional().catch(undefined),
    currentUserId: z.coerce.number().int().optional().catch(undefined),
    userId: z.coerce.number().int().optional().catch(undefined),
    genres: z.array(z.string()).optional().catch(undefined),
    tags: z.array(z.string()).optional().catch(undefined),
    langs: z.array(z.string()).optional().catch(undefined),
    directors: z.array(z.string()).optional().catch(undefined),
    publishers: z.array(z.string()).optional().catch(undefined),
    actors: z.array(z.string()).optional().catch(undefined),
    authors: z.array(z.string()).optional().catch(undefined),
    companies: z.array(z.string()).optional().catch(undefined),
    networks: z.array(z.string()).optional().catch(undefined),
    creators: z.array(z.string()).optional().catch(undefined),
    platforms: z.array(z.enum(GamesPlatformsEnum)).optional().catch(undefined),
});

export const mediaListSearchSchema = mediaListArgsSchema.extend({
    view: z.enum(["grid", "list"]).optional().catch(undefined),
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
