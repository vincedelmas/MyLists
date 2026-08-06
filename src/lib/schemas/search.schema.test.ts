import {describe, expect, it} from "vitest";
import {ApiProviderType} from "@/lib/utils/enums";
import {globalSearchSchema} from "@/lib/schemas/search.schema";


describe("globalSearchSchema", () => {
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
