import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";


export type SearchType = z.infer<typeof searchTypeSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type SimpleSearch = z.infer<typeof simpleSearchSchema>;
export type HallOfFameSearch = z.infer<typeof hallOfFameSearchSchema>;


export const usernameFieldSchema = z.string();
export const mediaTypeFieldSchema = z.enum(MediaType);
export const positiveIntFieldSchema = z.number().int().positive();
export const sortingFieldSchema = z.string().optional().catch(undefined);
export const coercedPositiveIntFieldSchema = z.coerce.number().int().positive();
export const optionalSearchFieldSchema = z.string().optional().catch(undefined);
export const optionalTrimmedSearchFieldSchema = z.string().trim().optional().catch(undefined);
export const optionalCoercedBooleanFieldSchema = z.coerce.boolean().optional().catch(undefined);


export const mediaTypeApiIdSchema = z.object({
    apiId: z.string(),
    mediaType: mediaTypeFieldSchema,
})

export const mediaTypeMediaIdSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    mediaId: coercedPositiveIntFieldSchema,
})

export const mediaTypeUsernameSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    username: z.string().min(1),
})

export const paginationSchema = z.object({
    page: coercedPositiveIntFieldSchema.optional().catch(undefined),
    perPage: coercedPositiveIntFieldSchema.max(50).optional().catch(undefined),
});

export const simpleSearchSchema = paginationSchema.extend({
    search: optionalTrimmedSearchFieldSchema,
});

export const hallOfFameSearchSchema = simpleSearchSchema.extend({
    sorting: sortingFieldSchema,
});

export const simpleSearchUsernameSchema = simpleSearchSchema.extend({
    username: usernameFieldSchema,
});

export const searchTypeSchema = paginationSchema.extend({
    sorting: sortingFieldSchema,
    search: optionalSearchFieldSchema,
    sortDesc: z.boolean().optional().catch(true),
    total: coercedPositiveIntFieldSchema.optional().catch(undefined),
});

export const notificationSchema = z.object({
    type: z.enum(["media", "social"]),
})

export const notificationIdSchema = z.object({
    notificationId: coercedPositiveIntFieldSchema,
})

export const baseUsernameSchema = z.looseObject({
    username: usernameFieldSchema,
});
