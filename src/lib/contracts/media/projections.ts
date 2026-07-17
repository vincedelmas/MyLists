import * as z from "zod";
import {GamesPlatformsEnum, MediaType, PrivacyType, UpdateType} from "@/lib/utils/enums";


const libraryChangePayloadSchema = z.object({
    oldValue: z.json(),
    newValue: z.json(),
}).strict();

const libraryHistoryItemSchema = z.object({
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    mediaName: z.string(),
    mediaType: z.enum(MediaType),
    updateType: z.enum(UpdateType),
    payload: libraryChangePayloadSchema.nullable(),
    timestamp: z.string(),
}).strict();

export const libraryHistorySchema = z.array(libraryHistoryItemSchema);

const jobDetailsItemSchema = z.object({
    mediaId: z.number().int().positive(),
    mediaName: z.string(),
    imageCover: z.string(),
    releaseDate: z.string().nullable(),
    inUserList: z.boolean(),
}).strict();

const jobDetailsPage = <K extends MediaType>(kind: K) => z.object({
    kind: z.literal(kind),
    items: z.array(jobDetailsItemSchema),
    total: z.number().int().nonnegative(),
    pages: z.number().int().nonnegative(),
}).strict();

export const jobDetailsPageSchema = z.discriminatedUnion("kind", [
    jobDetailsPage(MediaType.SERIES),
    jobDetailsPage(MediaType.ANIME),
    jobDetailsPage(MediaType.MOVIES),
    jobDetailsPage(MediaType.GAMES),
    jobDetailsPage(MediaType.BOOKS),
    jobDetailsPage(MediaType.MANGA),
]);

const compatibleGamePlatformsSchema = z.array(z.object({
    name: z.enum(GamesPlatformsEnum),
}).strict());

const collectionPreviewSchema = z.object({
    mediaId: z.number().int().positive(),
    mediaName: z.string(),
    mediaCover: z.string(),
    releaseDate: z.string().nullable(),
}).strict();

const collectionSummarySchema = z.object({
    id: z.number().int().positive(),
    ownerId: z.number().int().positive(),
    ownerName: z.string(),
    ownerImage: z.string().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    mediaType: z.enum(MediaType),
    viewCount: z.number().int().nonnegative(),
    copiedCount: z.number().int().nonnegative(),
    ordered: z.boolean(),
    privacy: z.enum(PrivacyType),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
    itemsCount: z.number().int().nonnegative(),
    likeCount: z.number().int().nonnegative(),
    previews: z.array(collectionPreviewSchema),
}).strict();

const communityCollectionsPageSchema = z.object({
    items: z.array(collectionSummarySchema),
    page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    pages: z.number().int().nonnegative(),
    perPage: z.number().int().positive(),
}).strict();

export type LibraryHistory = z.infer<typeof libraryHistorySchema>;
export type JobDetailsPage = z.infer<typeof jobDetailsPageSchema>;
export type CompatibleGamePlatforms = z.infer<typeof compatibleGamePlatformsSchema>;
export type CollectionSummary = z.infer<typeof collectionSummarySchema>;
export type CommunityCollectionsPage = z.infer<typeof communityCollectionsPageSchema>;

export const validateLibraryHistory = <T extends LibraryHistory>(value: T): T => {
    if (process.env.NODE_ENV !== "production") libraryHistorySchema.parse(value);
    return value;
};

export const validateJobDetailsPage = <T extends JobDetailsPage>(value: T): T => {
    if (process.env.NODE_ENV !== "production") jobDetailsPageSchema.parse(value);
    return value;
};

export const validateCompatibleGamePlatforms = <T extends CompatibleGamePlatforms>(value: T): T => {
    if (process.env.NODE_ENV !== "production") compatibleGamePlatformsSchema.parse(value);
    return value;
};

export const validateCollectionSummaries = <T extends CollectionSummary[]>(value: T): T => {
    if (process.env.NODE_ENV !== "production") z.array(collectionSummarySchema).parse(value);
    return value;
};

export const validateCommunityCollectionsPage = <T extends CommunityCollectionsPage>(value: T): T => {
    if (process.env.NODE_ENV !== "production") communityCollectionsPageSchema.parse(value);
    return value;
};
