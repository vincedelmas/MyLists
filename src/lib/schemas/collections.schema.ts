import * as z from "zod";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {paginationSchema} from "@/lib/schemas/common.schema";


export type CreateCollection = z.infer<typeof createCollectionSchema>;
export type CommunitySearch = z.infer<typeof communityCollectionsSchema>;


const collectionItemSchema = z.object({
    mediaName: z.string().optional(),
    mediaCover: z.string().optional(),
    mediaId: z.coerce.number().int().positive(),
    annotation: z.string().trim().max(500).optional().nullable(),
});


export const createCollectionSchema = z.object({
    ordered: z.boolean(),
    privacy: z.enum(PrivacyType),
    mediaType: z.enum(MediaType),
    items: z.array(collectionItemSchema).min(1, "Collection must contain at least 1 item."),
    title: z.string().trim()
        .min(3, "Title must be at least 3 characters long")
        .max(100, "Title is too long (max 100 characters)"),
    description: z.string().trim().max(400, "Description cannot exceed 400 characters").optional().nullable(),
});

export const updateCollectionSchema = z.object({
    ordered: z.boolean(),
    privacy: z.enum(PrivacyType),
    collectionId: z.coerce.number().int().positive(),
    items: z.array(collectionItemSchema).min(1, "Collection must contain at least 1 item."),
    title: z.string().trim()
        .min(3, "Title must be at least 3 characters long")
        .max(100, "Title is too long (max 100 characters)"),
    description: z.string().trim().max(400, "Description cannot exceed 400 characters").optional().nullable(),
});

export const collectionIdSchema = z.object({
    collectionId: z.coerce.number().int().positive(),
});

export const userCollectionsSchema = z.object({
    username: z.string(),
    mediaType: z.enum(MediaType).optional(),
});

export const communityCollectionsSchema = paginationSchema.extend({
    search: z.string().optional().catch(undefined),
    mediaType: z.enum(MediaType).optional().catch(undefined),
});

export const mediaCommunityCollectionsSchema = z.object({
    mediaType: z.enum(MediaType),
    mediaId: z.coerce.number().int().positive(),
});

export const collectionMediaMembershipsSchema = z.object({
    mediaType: z.enum(MediaType),
    mediaId: z.coerce.number().int().positive(),
});

export const collectionMediaItemActionSchema = collectionMediaMembershipsSchema.extend({
    collectionId: z.coerce.number().int().positive(),
});
