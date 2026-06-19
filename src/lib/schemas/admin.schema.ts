import * as z from "zod";
import {AchievementDifficulty, PrivacyType, RoleType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, positiveIntFieldSchema} from "@/lib/schemas/common.schema";


export type AchievementTier = z.infer<typeof tierAchievementSchema>;
export type AdminUpdatePayload = z.infer<typeof adminUpdatePayloadSchema>;


const adminUpdatePayloadSchema = z.object({
    role: z.enum(RoleType).optional(),
    deleteUser: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    privacy: z.enum(PrivacyType).optional(),
    showOnboarding: z.boolean().optional(),
    showUpdateModal: z.boolean().optional(),
});

const tierAchievementSchema = z.object({
    id: z.number(),
    achievementId: z.number(),
    rarity: z.number().nullable(),
    difficulty: z.enum(AchievementDifficulty),
    criteria: z.object({
        count: z.number(),
    }),
});


export const adminPostUpdateUserSchema = z.object({
    userId: positiveIntFieldSchema.optional(),
    payload: adminUpdatePayloadSchema,
});

export const adminUpdateAchievementSchema = z.object({
    achievementId: positiveIntFieldSchema,
    name: z.string(),
    description: z.string(),
});

export const adminPostUpdateTiersSchema = z.object({
    tiers: z.array(tierAchievementSchema),
});

export const adminTriggerTaskSchema = z.object({
    taskName: z.string(),
    input: z.record(z.any(), z.any()),
});

export const adminDeleteArchivedTaskSchema = z.object({
    taskId: z.string(),
});

export const adminDeleteErrorLogSchema = z.object({
    errorIds: z.array(z.number()).nullable(),
});

export const adminLlmResponseSchema = z.array(z.object({
    bookApiId: z.string(),
    genres: z.array(z.string()),
}));

export const adminRefreshSchema = z.object({
    recentPage: coercedPositiveIntFieldSchema.default(1),
    topRange: z.enum(["30d", "90d", "1y", "all"]).default("all"),
    dailyRange: z.enum(["30d", "90d", "1y", "all"]).default("30d"),
});

export const adminApiMonitoringSchema = z.object({
    recentPage: coercedPositiveIntFieldSchema.default(1),
    range: z.enum(["24h", "7d", "30d", "90d", "all"]).default("30d"),
    dailyRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});
