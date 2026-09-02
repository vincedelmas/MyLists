import * as z from "zod";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, optionalTrimmedSearchFieldSchema} from "@/lib/schemas/common.schema";


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

const mediaActiveTabSchema = z.union([
    z.literal("all"),
    z.enum(MediaType),
]);


const optionalAdvancedTextSchema = z.preprocess((value) => {
    return typeof value === "string" ? value.trim() || undefined : value;
}, z.string().max(120).optional());


const optionalAdvancedYearSchema = z.number()
    .int("Enter a whole release year.")
    .min(1870, "Release years must be between 1870 and 2200.")
    .max(2200, "Release years must be between 1870 and 2200.")
    .optional();


const optionalBookIsbnSchema = z.preprocess((value) => typeof value === "string" ? value.trim() || undefined : value,
    z.string().max(32).refine(value => /^(?:\d{9}[\dX]|\d{13})$/i.test(value.replace(/[\s-]/g, "")), {
        message: "Enter a valid ISBN-10 or ISBN-13.",
    }).optional(),
);


const optionalBookLanguageSchema = z.preprocess(
    value => typeof value === "string" ? value.trim().toLowerCase() || undefined : value,
    z.string().regex(/^[a-z]{2}$/, "Enter a two-letter language code.").optional(),
);


const bookAdvancedSearchFiltersSchema = z.object({
    isbn: optionalBookIsbnSchema,
    author: optionalAdvancedTextSchema,
    subject: optionalAdvancedTextSchema,
    language: optionalBookLanguageSchema,
    publisher: optionalAdvancedTextSchema,
    provider: z.literal(ApiProviderType.BOOKS),
    orderBy: z.enum(["relevance", "newest"]).optional(),
    printType: z.enum(["books", "magazines"]).optional(),
    availability: z.enum(["partial", "full", "free-ebooks", "paid-ebooks", "ebooks"]).optional(),
});


const gameAdvancedSearchFiltersSchema = z.object({
    provider: z.literal(ApiProviderType.IGDB),
    releaseYearTo: optionalAdvancedYearSchema,
    releaseYearFrom: optionalAdvancedYearSchema,
    genreId: z.number().int().positive().optional(),
    platformId: z.number().int().positive().optional(),
    minimumRating: z.number().min(0).max(100).optional(),
});


const advancedSearchFiltersSchema = z.discriminatedUnion("provider", [
    bookAdvancedSearchFiltersSchema,
    gameAdvancedSearchFiltersSchema,
]);


const bookAdvancedSearchSchema = z.object({
    advancedFilters: bookAdvancedSearchFiltersSchema.optional(),
    query: z.string().trim().refine(q => q.length === 0 || q.length >= 2, { message: "Book titles must contain at least two characters." }),
}).superRefine(({ query, advancedFilters }, ctx) => {
    const hasBookCriterion = [
        query,
        advancedFilters?.isbn,
        advancedFilters?.author,
        advancedFilters?.subject,
        advancedFilters?.publisher,
    ].some(Boolean);

    if (!hasBookCriterion) {
        ctx.addIssue({
            code: "custom",
            path: ["advancedFilters"],
            message: "Add a title, author, ISBN, publisher, or subject to search books.",
        });
    }
});


const gameAdvancedSearchSchema = z.object({
    advancedFilters: gameAdvancedSearchFiltersSchema.optional(),
    query: z.string().trim().refine(q => q.length === 0 || q.length >= 2, { message: "Game titles must contain at least two characters." }),
}).superRefine(({ query, advancedFilters }, ctx) => {
    if (advancedFilters?.releaseYearFrom && advancedFilters.releaseYearTo && advancedFilters.releaseYearFrom > advancedFilters.releaseYearTo) {
        ctx.addIssue({
            code: "custom",
            path: ["advancedFilters", "releaseYearFrom"],
            message: "The first release year must be before the last release year.",
        });
    }

    const hasGameCriterion = query.length > 0 || [
        advancedFilters?.genreId,
        advancedFilters?.platformId,
        advancedFilters?.releaseYearTo,
        advancedFilters?.minimumRating,
        advancedFilters?.releaseYearFrom,
    ].some(value => value !== undefined);

    if (!hasGameCriterion) {
        ctx.addIssue({
            code: "custom",
            path: ["advancedFilters"],
            message: "Add a title or at least one game filter.",
        });
    }
});


const getAdvancedSearchValidationError = (result: z.ZodSafeParseResult<unknown>) => {
    return result.success ? undefined : result.error.issues[0]?.message;
};


export const validateBookAdvancedSearch = (query: string, filters?: AdvancedSearchFilters) => {
    return getAdvancedSearchValidationError(bookAdvancedSearchSchema.safeParse({ query, advancedFilters: filters }));
};


export const validateGameAdvancedSearch = (query: string, filters?: AdvancedSearchFilters) => {
    return getAdvancedSearchValidationError(gameAdvancedSearchSchema.safeParse({ query, advancedFilters: filters }));
};


export const cleanBookAdvancedSearchFilters = (filters: AdvancedSearchFilters) => {
    return bookAdvancedSearchFiltersSchema.parse(filters);
};


export const cleanGameAdvancedSearchFilters = (filters: AdvancedSearchFilters) => {
    return gameAdvancedSearchFiltersSchema.parse(filters);
};


const urlBookAdvancedSearchFiltersSchema = z.object({
    provider: z.literal(ApiProviderType.BOOKS),
    isbn: optionalBookIsbnSchema.catch(undefined),
    author: optionalAdvancedTextSchema.catch(undefined),
    subject: optionalAdvancedTextSchema.catch(undefined),
    language: optionalBookLanguageSchema.catch(undefined),
    publisher: optionalAdvancedTextSchema.catch(undefined),
    orderBy: z.enum(["relevance", "newest"]).optional().catch(undefined),
    printType: z.enum(["books", "magazines"]).optional().catch(undefined),
    availability: z.enum(["partial", "full", "free-ebooks", "paid-ebooks", "ebooks"]).optional().catch(undefined),
});


const urlGameAdvancedSearchFiltersSchema = z.object({
    provider: z.literal(ApiProviderType.IGDB),
    releaseYearTo: optionalAdvancedYearSchema.catch(undefined),
    releaseYearFrom: optionalAdvancedYearSchema.catch(undefined),
    genreId: z.number().int().positive().optional().catch(undefined),
    platformId: z.number().int().positive().optional().catch(undefined),
    minimumRating: z.number().min(0).max(100).optional().catch(undefined),
});


const urlAdvancedSearchFiltersSchema = z.discriminatedUnion("provider", [
    urlBookAdvancedSearchFiltersSchema,
    urlGameAdvancedSearchFiltersSchema,
]);


export const profileSearchSchema = z.object({
    activeTab: profileActiveTabSchema.optional().default("overview").catch("overview"),
});


export const mediaTabSearchSchema = z.object({
    activeTab: mediaActiveTabSchema.optional().default("all").catch("all"),
});


export const trendsSearchSchema = z.object({
    activeTab: trendsActiveTabSchema.optional().default("all").catch("all"),
});


export const globalSearchSchema = z.object({
    query: optionalTrimmedSearchFieldSchema,
    page: coercedPositiveIntFieldSchema.optional().default(1).catch(1),
    advancedFilters: urlAdvancedSearchFiltersSchema.optional().catch(undefined),
    apiProvider: z.enum(ApiProviderType).optional().default(ApiProviderType.TMDB).catch(ApiProviderType.TMDB),
});


export const navbarSearchSchema = z.object({
    query: z.string().trim(),
    apiProvider: z.enum(ApiProviderType),
    page: coercedPositiveIntFieldSchema,
    advancedFilters: advancedSearchFiltersSchema.optional(),
}).superRefine(({ query, apiProvider, advancedFilters }, ctx) => {
    if (advancedFilters && advancedFilters.provider !== apiProvider) return;

    const result = apiProvider === ApiProviderType.BOOKS
        ? bookAdvancedSearchSchema.safeParse({ query, advancedFilters })
        : apiProvider === ApiProviderType.IGDB
            ? gameAdvancedSearchSchema.safeParse({ query, advancedFilters })
            : undefined;

    if (!result || result.success) return;

    result.error.issues.forEach(issue => {
        ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    });
});
