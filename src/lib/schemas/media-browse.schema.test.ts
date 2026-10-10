import {describe, expect, it} from "vitest";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {jobDetailsSchema} from "./media-details.schema";
import {mediaBrowseFiltersSchema, mediaCatalogBrowseSearchSchema} from "./media-browse.schema";


describe("catalogue browsing URL controls", () => {
    it("retains bounded browsing filters and rating coercion while recovering malformed search", () => {
        expect(mediaBrowseFiltersSchema.parse({
            search: 1, minRating: "8.5", genres: ["  Drama  "], favorite: false, unknown: true,
        })).toEqual({ search: undefined, minRating: 8.5, genres: ["Drama"], favorite: false });

        for (const filters of [
            { minRating: -1 }, { minRating: 11 }, { favorite: "true" },
            { genres: Array.from({ length: 21 }, (_, index) => `Genre ${index}`) },
            { mediaFilters: { books: { favorite: true } } },
        ]) expect(mediaBrowseFiltersSchema.safeParse(filters).success).toBe(false);
    });

    it("strips removed personal filters and sorting while retaining catalogue controls", () => {
        expect(mediaCatalogBrowseSearchSchema.parse({
            search: "movie", status: Status.COMPLETED, genres: ["Drama"], tags: ["Viewer tag"],
            favorite: true, minRating: 8, library: "in", sorting: "rating_highest", display: "table",
        })).toEqual({ search: "movie", library: "in", sorting: undefined, display: "table" });
        expect(mediaCatalogBrowseSearchSchema.parse({ sorting: "provider_rating_highest", page: "2" }))
            .toEqual({ sorting: "provider_rating_highest", page: 2 });
    });

    it("rejects removed filters and personal sorting on job requests", () => {
        const request = { job: JobType.ACTOR, name: "Actor", mediaType: MediaType.MOVIES };
        expect(jobDetailsSchema.parse({ ...request, filters: { library: "in", sorting: "provider_rating_highest" } }).filters)
            .toEqual({ library: "in", sorting: "provider_rating_highest" });
        for (const filters of [
            { status: Status.COMPLETED }, { favorite: true }, { minRating: 8 }, { genres: ["Drama"] },
            { tags: ["Personal tag"] }, { sorting: "rating_highest" }, { sorting: "added_oldest" },
            { sorting: "modified_newest" }, { sorting: "playtime_highest" },
        ]) {
            expect(jobDetailsSchema.safeParse({ ...request, filters }).success).toBe(false);
        }
    });
});
