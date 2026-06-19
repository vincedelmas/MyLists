import * as z from "zod";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, optionalTrimmedSearchFieldSchema} from "@/lib/schemas/common.schema";


export type GlobalSearch = z.infer<typeof globalSearchSchema>;
export type TrendsActiveTab = z.infer<typeof trendsActiveTabSchema>;


const trendsActiveTabSchema = z.union([
    z.literal("all"),
    z.literal(MediaType.SERIES),
    z.literal(MediaType.MOVIES),
    z.literal(MediaType.GAMES),
]);


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
