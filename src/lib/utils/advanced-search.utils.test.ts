import {describe, expect, it} from "vitest";
import {ApiProviderType} from "@/lib/utils/enums";
import {hasSearchCriteria} from "@/lib/utils/advanced-search.utils";


describe("hasSearchCriteria", () => {
    it("rejects searches without a title or meaningful filter", () => {
        expect(hasSearchCriteria("", ApiProviderType.TMDB)).toBe(false);
        expect(hasSearchCriteria("", ApiProviderType.BOOKS, { provider: ApiProviderType.BOOKS })).toBe(false);
    });


    it("accepts either a title or a meaningful advanced filter", () => {
        expect(hasSearchCriteria("Dune", ApiProviderType.TMDB)).toBe(true);
        expect(hasSearchCriteria("", ApiProviderType.BOOKS, {
            provider: ApiProviderType.BOOKS,
            author: "Ursula K. Le Guin",
        })).toBe(true);
    });


    it("rejects modifier-only book filters", () => {
        expect(hasSearchCriteria("", ApiProviderType.BOOKS, {
            provider: ApiProviderType.BOOKS,
            language: "pl",
        })).toBe(false);
    });


    it("rejects filters for a different provider", () => {
        expect(hasSearchCriteria("", ApiProviderType.BOOKS, {
            provider: ApiProviderType.IGDB,
            genreId: 12,
        })).toBe(false);
    });
});
