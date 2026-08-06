import {describe, expect, it} from "vitest";
import {ApiProviderType} from "@/lib/utils/enums";
import {hasSearchCriteria} from "@/lib/utils/advanced-search.utils";


describe("hasSearchCriteria", () => {
    it("rejects searches without a title or meaningful filter", () => {
        expect(hasSearchCriteria("")).toBe(false);
        expect(hasSearchCriteria("", { provider: ApiProviderType.BOOKS })).toBe(false);
    });


    it("accepts either a title or a meaningful advanced filter", () => {
        expect(hasSearchCriteria("Dune")).toBe(true);
        expect(hasSearchCriteria("", {
            provider: ApiProviderType.BOOKS,
            author: "Ursula K. Le Guin",
        })).toBe(true);
    });
});
