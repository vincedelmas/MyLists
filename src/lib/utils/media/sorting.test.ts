import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import {getMediaSortOptions} from "./sorting";


describe("shared media sorting", () => {
    it("limits catalogue controls and preserves media-specific list labels", () => {
        expect(getMediaSortOptions([MediaType.MOVIES], false).map(option => option.label)).toEqual([
            "Title A-Z", "Title Z-A", "TMDB Rating +", "TMDB Rating -", "Release Date +", "Release Date -",
        ]);
        expect(getMediaSortOptions([MediaType.BOOKS], false).map(option => option.label))
            .toEqual(["Title A-Z", "Title Z-A", "Published Date +", "Published Date -", "Pages +", "Pages -"]);
        expect(getMediaSortOptions([MediaType.MANGA], false).map(option => option.label))
            .toEqual(["Title A-Z", "Title Z-A", "Published Date +", "Published Date -", "Chapters +", "Chapters -"]);
        expect(getMediaSortOptions([MediaType.GAMES], true).map(option => option.value)).toContain("playtime_highest");
        expect(getMediaSortOptions([MediaType.GAMES], false).map(option => option.value)).not.toContain("playtime_highest");
    });

    it("offers only supported shared fields for mixed-media views and labels every saved sort direction", () => {
        const mixed = getMediaSortOptions(ALL_MEDIA_TYPES, true);
        expect(mixed.map(option => option.value)).not.toContain("provider_rating_highest");
        expect(mixed.map(option => option.value)).not.toContain("pages_highest");
        expect(mixed.find(option => option.value === "release_newest")!.label).toBe("Release Date +");
        expect(getMediaSortOptions([MediaType.MOVIES, MediaType.GAMES], true).map(option => option.value))
            .not.toContain("provider_rating_highest");
        expect(getMediaSortOptions([MediaType.MOVIES, MediaType.SERIES], true).map(option => option.value))
            .toContain("provider_rating_highest");
        for (const field of ["addedAt", "lastUpdated", "title", "rating", "releaseDate"]) {
            for (const direction of ["asc", "desc"]) {
                expect(mixed.some(option => {
                    const sort = MEDIA_SORT_DEFINITIONS[option.value];
                    return sort.field === field && sort.direction === direction;
                })).toBe(true);
            }
        }
    });
});
