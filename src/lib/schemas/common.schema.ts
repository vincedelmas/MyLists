import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";


export type SearchType = z.infer<typeof searchTypeSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type SimpleSearch = z.infer<typeof simpleSearchSchema>;
export type HallOfFameSearch = z.infer<typeof hallOfFameSearchSchema>;


export const mediaTypeFieldSchema = z.enum(MediaType);
export const positiveIntFieldSchema = z.number().int().positive();
export const coercedPositiveIntFieldSchema = z.coerce.number().int().positive();
export const optionalSearchFieldSchema = z.string().optional().catch(undefined);
export const optionalTrimmedSearchFieldSchema = z.string().trim().optional().catch(undefined);
export const optionalCoercedBooleanFieldSchema = z.coerce.boolean().optional().catch(undefined);
export const optionalCoercedPositiveIntFieldSchema = coercedPositiveIntFieldSchema.optional().catch(undefined);
export const pageFieldSchema = optionalCoercedPositiveIntFieldSchema;
export const perPageFieldSchema = coercedPositiveIntFieldSchema.max(50).optional().catch(undefined);
export const usernameFieldSchema = z.string();
export const requiredUsernameFieldSchema = z.string().min(1);
export const mediaIdFieldSchema = coercedPositiveIntFieldSchema;
export const apiIdFieldSchema = z.string();
export const sortingFieldSchema = z.string().optional().catch(undefined);


export const mediaTypeApiIdSchema = z.object({
    apiId: apiIdFieldSchema,
    mediaType: mediaTypeFieldSchema,
})

export const mediaTypeMediaIdSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    mediaId: mediaIdFieldSchema,
})

export const mediaTypeUsernameSchema = z.object({
    mediaType: mediaTypeFieldSchema,
    username: requiredUsernameFieldSchema,
})

export const paginationSchema = z.object({
    page: pageFieldSchema,
    perPage: perPageFieldSchema,
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
    sortDesc: z.boolean().optional().catch(true),
    search: optionalSearchFieldSchema,
    sorting: sortingFieldSchema,
    total: optionalCoercedPositiveIntFieldSchema,
});

export const mediaActionSchema = mediaTypeMediaIdSchema;

export const baseUsernameSchema = z.looseObject({
    username: usernameFieldSchema,
});

export const notificationSchema = z.object({
    type: z.enum(["media", "social"]),
})

export const notificationIdSchema = z.object({
    notificationId: coercedPositiveIntFieldSchema,
})
