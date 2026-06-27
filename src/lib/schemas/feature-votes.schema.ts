import * as z from "zod";
import {FeatureStatus} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, positiveIntFieldSchema} from "@/lib/schemas/common.schema";


export type PostFeatureStatus = z.infer<typeof postFeatureStatusSchema>;
export type PostFeatureRequest = z.infer<typeof postFeatureRequestSchema>;
export type FeatureVotesActiveTab = z.infer<typeof featureVotesActiveTabSchema>;


const featureVotesActiveTabSchema = z.union([
    z.literal("active"),
    z.enum(FeatureStatus),
]);

export const featureVotesSearchSchema = z.object({
    activeTab: featureVotesActiveTabSchema.optional().default("active").catch("active"),
});


export const postFeatureRequestSchema = z.object({
    title: z.string().trim()
        .min(3, "Title must be at least 3 characters long")
        .max(80, "Title is too long (max 80 characters)"),
    description: z.string().trim()
        .max(400, "Description cannot exceed 400 characters")
        .optional(),
});

export const postFeatureVoteSchema = z.object({
    featureId: coercedPositiveIntFieldSchema,
});

export const postFeatureStatusSchema = z.object({
    status: z.enum(FeatureStatus),
    featureId: positiveIntFieldSchema,
    adminComment: z.string().trim().max(1000, "Comment cannot exceed 1000 chars.").optional().nullable(),
});

export const postFeatureDeleteSchema = z.object({
    featureId: coercedPositiveIntFieldSchema,
});
