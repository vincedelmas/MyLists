import {describe, expect, it} from "vitest";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {globalSearchSchema, mediaTabSearchSchema, navbarSearchSchema} from "@/lib/schemas/search.schema";


const getValidationMessages = (value: unknown) => {
    const result = navbarSearchSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (result.success) return [];
    return result.error.issues.map(issue => issue.message);
};


describe("globalSearchSchema", () => {
    it("preserves TMDB type and year in URLs, and discards invalid combinations", () => {
        const filters = { provider: ApiProviderType.TMDB, mediaType: MediaType.SERIES, releaseYear: 2005 };
        expect(globalSearchSchema.parse({ advancedFilters: filters }).advancedFilters).toEqual(filters);
        expect(globalSearchSchema.parse({ advancedFilters: { ...filters, releaseYear: 1200 } }).advancedFilters)
            .toEqual({ provider: ApiProviderType.TMDB, mediaType: MediaType.SERIES });
        expect(globalSearchSchema.parse({ advancedFilters: { ...filters, mediaType: undefined } }).advancedFilters)
            .toBeUndefined();
    });

    it("accepts and normalizes any two-letter book language code", () => {
        const result = globalSearchSchema.parse({
            apiProvider: ApiProviderType.BOOKS,
            advancedFilters: {
                provider: ApiProviderType.BOOKS,
                language: "NL",
            },
        });

        expect(result.advancedFilters).toMatchObject({
            provider: ApiProviderType.BOOKS,
            language: "nl",
        });
    });


    it("discards malformed book language codes from URL search parameters", () => {
        const result = globalSearchSchema.parse({
            apiProvider: ApiProviderType.BOOKS,
            advancedFilters: {
                provider: ApiProviderType.BOOKS,
                language: "english",
            },
        });

        expect(result.advancedFilters).toEqual({ provider: ApiProviderType.BOOKS });
    });
});


describe("mediaTabSearchSchema", () => {
    it("defaults missing or invalid tabs to all and accepts media tabs", () => {
        expect(mediaTabSearchSchema.parse({})).toEqual({ activeTab: "all" });
        expect(mediaTabSearchSchema.parse({ activeTab: "invalid" })).toEqual({ activeTab: "all" });
        expect(mediaTabSearchSchema.parse({ activeTab: MediaType.GAMES })).toEqual({ activeTab: MediaType.GAMES });
    });
});


describe("navbarSearchSchema advanced-search validation", () => {
    const searchInput = {
        page: 1,
        query: "",
        apiProvider: ApiProviderType.BOOKS,
    };


    it("requires a title and a specific TMDB media type when filtering by year", () => {
        const input = { page: 1, query: "Dune", apiProvider: ApiProviderType.TMDB };
        expect(navbarSearchSchema.safeParse({
            ...input,
            advancedFilters: { provider: ApiProviderType.TMDB, mediaType: MediaType.MOVIES, releaseYear: 2021 },
        }).success).toBe(true);
        expect(getValidationMessages({
            ...input,
            advancedFilters: { provider: ApiProviderType.TMDB, releaseYear: 2021 },
        })).toContain("Choose Movies or TV shows to filter by year.");
        expect(getValidationMessages({ ...input, query: "" })).toContain("Enter at least two characters to search.");
    });


    it("normalizes valid book filters at the server boundary", () => {
        const result = navbarSearchSchema.parse({
            ...searchInput,
            advancedFilters: {
                provider: ApiProviderType.BOOKS,
                author: "  Ursula K. Le Guin  ",
                language: "NL",
            },
        });

        expect(result.advancedFilters).toMatchObject({
            provider: ApiProviderType.BOOKS,
            author: "Ursula K. Le Guin",
            language: "nl",
        });
    });


    it("rejects malformed ISBNs instead of silently discarding them", () => {
        const messages = getValidationMessages({
            ...searchInput,
            advancedFilters: {
                provider: ApiProviderType.BOOKS,
                isbn: "not-an-isbn",
            },
        });

        expect(messages).toContain("Enter a valid ISBN-10 or ISBN-13.");
    });


    it("rejects malformed book language codes at the server boundary", () => {
        const messages = getValidationMessages({
            ...searchInput,
            advancedFilters: {
                provider: ApiProviderType.BOOKS,
                author: "Octavia E. Butler",
                language: "english",
            },
        });

        expect(messages).toContain("Enter a two-letter language code.");
    });


    it("requires a real book criterion", () => {
        const messages = getValidationMessages({
            ...searchInput,
            advancedFilters: {
                provider: ApiProviderType.BOOKS,
                language: "en",
                orderBy: "newest",
            },
        });

        expect(messages).toContain("Add a title, author, ISBN, publisher, or subject to search books.");
    });


    it("rejects one-character book and game titles", () => {
        expect(getValidationMessages({ ...searchInput, query: "D" }))
            .toContain("Book titles must contain at least two characters.");
        expect(getValidationMessages({
            ...searchInput,
            query: "Z",
            apiProvider: ApiProviderType.IGDB,
        })).toContain("Game titles must contain at least two characters.");
    });


    it("rejects reversed and out-of-range game years", () => {
        const reversedMessages = getValidationMessages({
            ...searchInput,
            apiProvider: ApiProviderType.IGDB,
            advancedFilters: {
                provider: ApiProviderType.IGDB,
                releaseYearFrom: 2026,
                releaseYearTo: 2020,
            },
        });
        const outOfRangeMessages = getValidationMessages({
            ...searchInput,
            apiProvider: ApiProviderType.IGDB,
            advancedFilters: {
                provider: ApiProviderType.IGDB,
                releaseYearFrom: 1200,
            },
        });

        expect(reversedMessages).toContain("The first release year must be before the last release year.");
        expect(outOfRangeMessages).toContain("Release years must be between 1870 and 2200.");
    });


    it("requires at least one game criterion but accepts a zero minimum rating", () => {
        expect(getValidationMessages({
            ...searchInput,
            apiProvider: ApiProviderType.IGDB,
            advancedFilters: { provider: ApiProviderType.IGDB },
        })).toContain("Add a title or at least one game filter.");

        expect(navbarSearchSchema.safeParse({
            ...searchInput,
            apiProvider: ApiProviderType.IGDB,
            advancedFilters: {
                provider: ApiProviderType.IGDB,
                minimumRating: 0,
            },
        }).success).toBe(true);
    });
});
