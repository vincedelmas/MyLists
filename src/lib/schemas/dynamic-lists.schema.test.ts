import {describe, expect, it} from "vitest";
import {toJSONSchema} from "zod";
import {MediaType, Status} from "@/lib/utils/enums";
import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import {dynamicListPreviewSchema, dynamicListSpecSchema} from "./dynamic-lists.schema";


describe("untrusted dynamic list specifications", () => {
    const spec = DYNAMIC_LIST_PRESETS[0];

    it("accepts every preset and normalizes titles and tags", () => {
        for (const preset of DYNAMIC_LIST_PRESETS) expect(dynamicListSpecSchema.safeParse(preset).success).toBe(true);
        expect(dynamicListSpecSchema.parse({ ...spec, title: "  My view  ", filters: { tags: ["  cozy  "] } }))
            .toMatchObject({ title: "My view", filters: { tags: ["cozy"] } });
    });

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

    it("accepts only supported media, statuses, sort fields, display modes and spec versions", () => {
        for (const candidate of [
            { ...spec, version: 2 },
            { ...spec, mediaTypes: [] },
            { ...spec, mediaTypes: [MediaType.MOVIES, MediaType.MOVIES] },
            { ...spec, mediaTypes: ["movies; DROP TABLE user"] },
            { ...spec, filters: { statusGroup: "Multiplayer" } },
            { ...spec, sort: { field: "random()", direction: "asc" } },
            { ...spec, sort: { field: "title", direction: "ASC; DELETE FROM user" } },
            { ...spec, display: "html" },
        ]) expect(dynamicListSpecSchema.safeParse(candidate).success).toBe(false);
        expect(dynamicListSpecSchema.safeParse({ ...spec, mediaTypes: [MediaType.MOVIES, MediaType.BOOKS] }).success).toBe(true);
    });

    it("bounds relative calendar age and rating ranges", () => {
        for (const monthsAgo of [-1, 0, 1.5, 121, "6"]) {
            expect(dynamicListSpecSchema.safeParse({ ...spec, filters: { addedBefore: { monthsAgo } } }).success).toBe(false);
        }
        for (const filters of [{ minRating: -1 }, { maxRating: 11 }, { minRating: 9, maxRating: 8 }, { minRating: NaN }, { minRating: "8" }, { maxRating: "9" }, { favorite: "true" }]) {
            expect(dynamicListSpecSchema.safeParse({ ...spec, filters }).success).toBe(false);
        }
        expect(dynamicListSpecSchema.safeParse({ ...spec, filters: { addedBefore: { monthsAgo: 120 }, minRating: 0, maxRating: 10, favorite: false } }).success).toBe(true);
        expect(toJSONSchema(dynamicListSpecSchema, { io: "input" })).toMatchObject({ properties: { filters: { properties: {
            minRating: { type: "number", minimum: 0, maximum: 10 },
            maxRating: { type: "number", minimum: 0, maximum: 10 },
        } } } });
    });

    it("bounds title and tag input sizes and rejects blank values", () => {
        for (const title of ["", "  ", "x".repeat(101)]) {
            expect(dynamicListSpecSchema.safeParse({ ...spec, title }).success).toBe(false);
        }
        for (const tags of [[], ["  "], ["x".repeat(101)], Array.from({ length: 21 }, (_, i) => `tag${i}`)]) {
            expect(dynamicListSpecSchema.safeParse({ ...spec, filters: { tags } }).success).toBe(false);
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

    it("validates extended filters while preserving existing specifications", () => {
        const filters = {
            search: "  space  ", statuses: [Status.COMPLETED, Status.PLAN_TO_WATCH],
            addedWithin: { monthsAgo: 12 }, addedBefore: { monthsAgo: 6 }, updatedBefore: { monthsAgo: 3 },
            minReleaseYear: 1990, maxReleaseYear: 2026, rated: false, hasComment: true,
            genres: ["  Science Fiction  "], tags: ["cozy"], tagsMatch: "all", excludeTags: ["  skip  "],
        };
        expect(dynamicListSpecSchema.parse({ ...spec, filters })).toMatchObject({ filters: {
            ...filters, search: "space", genres: ["Science Fiction"], excludeTags: ["skip"],
        } });
        expect(dynamicListSpecSchema.parse(spec)).toEqual(spec);
        for (const invalid of [
            { search: "  " }, { search: "x".repeat(101) }, { statuses: [] },
            { statuses: [Status.COMPLETED, Status.COMPLETED] }, { statuses: ["unknown"] },
            { genres: [] }, { excludeTags: ["  "] }, { tagsMatch: "none" },
            { minReleaseYear: 0 }, { maxReleaseYear: 10_000 }, { minReleaseYear: 2000.5 },
            { minReleaseYear: 2026, maxReleaseYear: 2025 }, { rated: "false" }, { hasComment: "true" },
            { addedWithin: { monthsAgo: 0 } }, { updatedBefore: { monthsAgo: 121 } },
            { addedBefore: { monthsAgo: 6 }, addedWithin: { monthsAgo: 6 } },
            { addedBefore: { monthsAgo: 6 }, addedWithin: { monthsAgo: 3 } },
        ]) expect(dynamicListSpecSchema.safeParse({ ...spec, filters: invalid }).success).toBe(false);
    });

    it("defaults and bounds pagination without coercing untrusted values", () => {
        expect(dynamicListPreviewSchema.parse({ spec }).page).toBe(1);
        for (const page of [0, -1, 1.5, 100_001, "1"]) {
            expect(dynamicListPreviewSchema.safeParse({ spec, page }).success).toBe(false);
        }
        expect(dynamicListPreviewSchema.safeParse({ spec, page: 100_000 }).success).toBe(true);
    });
});
