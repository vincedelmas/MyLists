import * as z from "zod";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, optionalTrimmedSearchFieldSchema} from "@/lib/schemas/common.schema";


export type GlobalSearch = z.infer<typeof globalSearchSchema>;
export type TrendsActiveTab = z.infer<typeof trendsActiveTabSchema>;
export type ProfileActiveTab = z.infer<typeof profileActiveTabSchema>;
export type AdvancedSearchFilters = z.infer<typeof advancedSearchFiltersSchema>;
export type BookAdvancedSearchFilters = z.infer<typeof bookAdvancedSearchFiltersSchema>;
export type GameAdvancedSearchFilters = z.infer<typeof gameAdvancedSearchFiltersSchema>;


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


const optionalAdvancedTextSchema = z.string().trim().max(120).optional().catch(undefined);
const optionalAdvancedYearSchema = z.number().int().min(1870).max(2200).optional().catch(undefined);


export const bookAdvancedSearchFiltersSchema = z.object({
    title: optionalAdvancedTextSchema,
    author: optionalAdvancedTextSchema,
    subject: optionalAdvancedTextSchema,
    publisher: optionalAdvancedTextSchema,
    provider: z.literal(ApiProviderType.BOOKS),
    orderBy: z.enum(["relevance", "newest"]).optional().catch(undefined),
    printType: z.enum(["books", "magazines"]).optional().catch(undefined),
    isbn: z.string().trim().max(32).optional().catch(undefined),
    language: z.enum(["en", "fr", "de", "es", "it", "ja"]).optional().catch(undefined),
    availability: z.enum(["partial", "full", "free-ebooks", "paid-ebooks", "ebooks"]).optional().catch(undefined),
});


export const gameAdvancedSearchFiltersSchema = z.object({
    title: optionalAdvancedTextSchema,
    provider: z.literal(ApiProviderType.IGDB),
    releaseYearTo: optionalAdvancedYearSchema,
    releaseYearFrom: optionalAdvancedYearSchema,
    genreId: z.number().int().positive().optional().catch(undefined),
    platformId: z.number().int().positive().optional().catch(undefined),
    minimumRating: z.number().min(0).max(100).optional().catch(undefined),
});


export const advancedSearchFiltersSchema = z.discriminatedUnion("provider", [
    bookAdvancedSearchFiltersSchema,
    gameAdvancedSearchFiltersSchema,
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
    advancedFilters: advancedSearchFiltersSchema.optional().catch(undefined),
});


export const navbarSearchSchema = z.object({
    query: z.string().trim(),
    apiProvider: z.enum(ApiProviderType),
    page: coercedPositiveIntFieldSchema,
    advancedFilters: advancedSearchFiltersSchema.optional().catch(undefined),
});
