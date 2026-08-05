import * as z from "zod";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, optionalTrimmedSearchFieldSchema} from "@/lib/schemas/common.schema";


export type GlobalSearch = z.infer<typeof globalSearchSchema>;
export type TrendsActiveTab = z.infer<typeof trendsActiveTabSchema>;
export type ProfileActiveTab = z.infer<typeof profileActiveTabSchema>;


export const TREND_MEDIA_TYPES = [
    MediaType.SERIES,
    MediaType.MOVIES,
    MediaType.GAMES,
] as const;


const trendsActiveTabSchema = z.union([
    z.literal("all"),
    z.enum(TREND_MEDIA_TYPES),
]);

const profileActiveTabSchema = z.union([
    z.literal("overview"),
    z.enum(MediaType),
]);


export const profileSearchSchema = z.object({
    activeTab: profileActiveTabSchema.optional().default("overview").catch("overview"),
});


export const trendsSearchSchema = z.object({
    activeTab: trendsActiveTabSchema.optional().default("all").catch("all"),
});


export const globalSearchSchema = z.object({
    query: optionalTrimmedSearchFieldSchema,
    apiProvider: z.enum(ApiProviderType).optional().default(ApiProviderType.TMDB).catch(ApiProviderType.TMDB),
});


export const navbarSearchSchema = z.object({
    query: z.string().trim(),
    apiProvider: z.enum(ApiProviderType),
    page: coercedPositiveIntFieldSchema,
});
