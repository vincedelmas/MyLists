import * as z from "zod";
import {paginationSchema} from "@/lib/schemas/common.schema";
import {GamesPlatformsEnum, JobType, MediaType, Status} from "@/lib/utils/enums";


export type MediaListArgs = z.infer<typeof mediaListArgsSchema>;


export const mediaListArgsSchema = paginationSchema.extend({
    search: z.string().optional().catch(undefined),
    sorting: z.string().optional().catch(undefined),
    status: z.array(z.enum(Status)).optional().catch(undefined),
    currentUserId: z.coerce.number().int().optional().catch(undefined),
    userId: z.coerce.number().int().optional().catch(undefined),
    favorite: z.coerce.boolean().optional().catch(undefined),
    comment: z.coerce.boolean().optional().catch(undefined),
    hideCommon: z.coerce.boolean().optional().catch(undefined),
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
    username: z.string(),
    args: mediaListArgsSchema,
    mediaType: z.enum(MediaType),
});

export const mediaListFiltersSchema = z.looseObject({
    mediaType: z.enum(MediaType),
});

export const mediaListSearchFiltersSchema = z.looseObject({
    job: z.enum(JobType),
    mediaType: z.enum(MediaType),
    query: z.string().min(1),
});
