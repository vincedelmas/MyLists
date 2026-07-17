import * as z from "zod";
import {MediaType, PrivacyType, UpdateType} from "@/lib/utils/enums";


export type LibraryHistory = z.infer<typeof libraryHistorySchema>;
export type CollectionSummary = z.infer<typeof collectionSummarySchema>;


const libraryChangePayloadSchema = z.strictObject({
    oldValue: z.json(),
    newValue: z.json(),
});

const libraryHistoryItemSchema = z.strictObject({
    mediaName: z.string(),
    timestamp: z.string(),
    mediaType: z.enum(MediaType),
    updateType: z.enum(UpdateType),
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    payload: libraryChangePayloadSchema.nullable(),
});

const jobDetailsItemSchema = z.strictObject({
    mediaName: z.string(),
    imageCover: z.string(),
    inUserList: z.boolean(),
    releaseDate: z.string().nullable(),
    mediaId: z.number().int().positive(),
});

const collectionPreviewSchema = z.strictObject({
    mediaName: z.string(),
    mediaCover: z.string(),
    releaseDate: z.string().nullable(),
    mediaId: z.number().int().positive(),
});

const collectionSummarySchema = z.strictObject({
    id: z.number().int().positive(),
    title: z.string(),
    ordered: z.boolean(),
    createdAt: z.string(),
    ownerName: z.string(),
    privacy: z.enum(PrivacyType),
    mediaType: z.enum(MediaType),
    updatedAt: z.string().nullable(),
    ownerImage: z.string().nullable(),
    description: z.string().nullable(),
    ownerId: z.number().int().positive(),
    likeCount: z.number().int().nonnegative(),
    viewCount: z.number().int().nonnegative(),
    itemsCount: z.number().int().nonnegative(),
    copiedCount: z.number().int().nonnegative(),
    previews: z.array(collectionPreviewSchema),
});

const communityCollectionsPageSchema = z.strictObject({
    page: z.number().int().positive(),
    perPage: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    pages: z.number().int().nonnegative(),
    items: z.array(collectionSummarySchema),
});

const jobDetailsPage = <K extends MediaType>(kind: K) => {
    return z.strictObject({
        kind: z.literal(kind),
        items: z.array(jobDetailsItemSchema),
        total: z.number().int().nonnegative(),
        pages: z.number().int().nonnegative(),
    });
}

export const libraryHistorySchema = z.array(libraryHistoryItemSchema);
export const validateCollectionSummaries = (value: unknown) => z.array(collectionSummarySchema).parse(value);
export const validateCommunityCollectionsPage = (value: unknown) => communityCollectionsPageSchema.parse(value);

export const jobDetailsPageSchema = z.discriminatedUnion("kind", [
    jobDetailsPage(MediaType.SERIES),
    jobDetailsPage(MediaType.ANIME),
    jobDetailsPage(MediaType.MOVIES),
    jobDetailsPage(MediaType.GAMES),
    jobDetailsPage(MediaType.BOOKS),
    jobDetailsPage(MediaType.MANGA),
]);
