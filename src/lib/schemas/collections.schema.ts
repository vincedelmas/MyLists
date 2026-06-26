import * as z from "zod";
import {PrivacyType} from "@/lib/utils/enums";
import {
    coercedPositiveIntFieldSchema,
    mediaTypeFieldSchema,
    mediaTypeMediaIdSchema,
    optionalSearchFieldSchema,
    paginationSchema,
    positiveIntFieldSchema,
    usernameFieldSchema
} from "@/lib/schemas/common.schema";


export type CreateCollection = z.infer<typeof createCollectionSchema>;
export type CommunitySearch = z.infer<typeof communityCollectionsSchema>;


const collectionItemSchema = z.object({
    mediaName: z.string().optional(),
    mediaCover: z.string().optional(),
    mediaId: positiveIntFieldSchema,
    annotation: z.string().trim().max(500).optional().nullable(),
});

const collectionBaseSchema = z.object({
    ordered: z.boolean(),
    privacy: z.enum(PrivacyType),
    items: z.array(collectionItemSchema).min(1, "Collection must contain at least 1 item."),
    title: z.string().trim()
        .min(3, "Title must be at least 3 characters long")
        .max(100, "Title is too long (max 100 characters)"),
    description: z.string().trim().max(400, "Description cannot exceed 400 characters").optional().nullable(),
});

export const createCollectionSchema = collectionBaseSchema.extend({
    mediaType: mediaTypeFieldSchema,
});

export const updateCollectionSchema = collectionBaseSchema.extend({
    collectionId: coercedPositiveIntFieldSchema,
});

export const collectionIdSchema = z.object({
    collectionId: coercedPositiveIntFieldSchema,
});

export const userCollectionsSchema = z.object({
    username: usernameFieldSchema,
    mediaType: mediaTypeFieldSchema.optional(),
});

export const communityCollectionsSchema = paginationSchema.extend({
    search: optionalSearchFieldSchema,
    mediaType: mediaTypeFieldSchema.optional().catch(undefined),
});

export const mediaCommunityCollectionsSchema = mediaTypeMediaIdSchema;

export const collectionMediaMembershipsSchema = mediaTypeMediaIdSchema;

export const collectionMediaItemActionSchema = collectionMediaMembershipsSchema.extend({
    collectionId: coercedPositiveIntFieldSchema,
});
