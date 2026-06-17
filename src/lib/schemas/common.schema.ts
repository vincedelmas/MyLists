import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";


export type SearchType = z.infer<typeof searchTypeSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type SimpleSearch = z.infer<typeof simpleSearchSchema>;
export type HallOfFameSearch = z.infer<typeof hallOfFameSearchSchema>;


export const mediaTypeApiIdSchema = z.object({
    apiId: z.string(),
    mediaType: z.enum(MediaType),
})


export const mediaTypeMediaIdSchema = z.object({
    mediaType: z.enum(MediaType),
    mediaId: z.coerce.number().int().positive(),
})


export const mediaTypeUsernameSchema = z.object({
    mediaType: z.enum(MediaType),
    username: z.string().min(1),
})


export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().optional().catch(undefined),
    perPage: z.coerce.number().int().positive().max(50).optional().catch(undefined),
});


export const simpleSearchSchema = paginationSchema.extend({
    search: z.string().trim().optional().catch(undefined),
});


export const hallOfFameSearchSchema = simpleSearchSchema.extend({
    sorting: z.string().optional().catch(undefined),
});


export const simpleSearchUsernameSchema = simpleSearchSchema.extend({
    username: z.string(),
});


export const searchTypeSchema = paginationSchema.extend({
    sortDesc: z.boolean().optional().catch(true),
    search: z.string().optional().catch(undefined),
    sorting: z.string().optional().catch(undefined),
    total: z.coerce.number().int().positive().optional().catch(undefined),
});

export const mediaActionSchema = z.object({
    mediaType: z.enum(MediaType),
    mediaId: z.coerce.number().int().positive(),
});

export const tagSchema = z.object({
    name: z.string(),
    oldName: z.string().optional(),
});

export const baseUsernameSchema = z.looseObject({
    username: z.string(),
});
