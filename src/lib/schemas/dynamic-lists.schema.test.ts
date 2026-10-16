import {describe, expect, it} from "vitest";


import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import {dynamicListPreviewSchema, dynamicListSpecSchema} from "./dynamic-lists.schema";


describe("untrusted dynamic list specifications", () => {
    const spec = DYNAMIC_LIST_PRESETS[0];

it("rejects ownership overrides, raw SQL and unknown nested fields", () => {
        for (const candidate of [
            { ...spec, userId: 2 },
            { ...spec, sql: "SELECT * FROM user" },
            { ...spec, filters: { ...spec.filters, userId: 2 } },
            { ...spec, filters: { addedBefore: { monthsAgo: 6, date: "2020-01-01" } } },
            { ...spec, sort: { ...spec.sort, expression: "random()" } },
        ]) expect(dynamicListSpecSchema.safeParse(candidate).success).toBe(false);
        expect(dynamicListPreviewSchema.safeParse({ spec, userId: 2 }).success).toBe(false);
    });

    it("bounds titles and accepts only distinct positive tag IDs", () => {
        for (const title of ["", "  ", "x".repeat(101)]) {
            expect(dynamicListSpecSchema.safeParse({ ...spec, title }).success).toBe(false);
        }
        for (const tags of [[0], [-1], [1.5], ["cozy"], [1, 1], Array.from({ length: 21 }, (_, i) => i + 1)]) {
            expect(dynamicListSpecSchema.safeParse({ ...spec, filters: { mediaFilters: { movies: { tagRules: [{ tags }] } } } }).success).toBe(false);
        }
    });

    it("accepts scoped media facets and rejects unsupported or unbounded metadata", () => {
        expect(dynamicListSpecSchema.parse({ ...spec, filters: { mediaFilters: {
            movies: { actors: ["  Actor  "], directors: ["Director"], langs: ["en"] },
            books: { authors: ["Author"] }, games: { companies: ["Studio"], platforms: ["PC"] },
            series: { creators: ["Creator"], networks: ["Network"], langs: ["US"] },
            manga: { publishers: ["Publisher"] },
        } } })).toMatchObject({ filters: { mediaFilters: { movies: { actors: ["Actor"] } } } });

        for (const mediaFilters of [
            { books: { actors: ["Actor"] } }, { movies: { platforms: ["PC"] } },
            { books: { favorite: true } },
            { games: { platforms: ["Unrecognized platform"] } }, { unknown: { actors: ["Actor"] } },
            { movies: { actors: ["  "] } }, { movies: { actors: ["x".repeat(101)] } },
            { movies: { actors: Array.from({ length: 21 }, (_, i) => `Actor ${i}`) } },
            { movies: { actors: ["Actor"], sql: "SELECT * FROM user" } },
        ]) expect(dynamicListSpecSchema.safeParse({ ...spec, filters: { mediaFilters } }).success).toBe(false);
    });

});
