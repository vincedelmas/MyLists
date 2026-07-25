import {describe, expect, it} from "vitest";
import {getActiveMediaSettings, getActiveMediaTypes, resolveMediaTypeActive,} from "@/lib/utils/media-list-activation";
import {MediaType} from "@/lib/utils/enums";


const settings = [
    { mediaType: MediaType.MOVIES, active: true, label: "Movies" },
    { mediaType: MediaType.ANIME, active: false, label: "Anime" },
];


describe("media-list activation helpers", () => {
    it("uses one activation rule for filtering, media types, and individual lookups", () => {
        expect(getActiveMediaTypes(settings)).toEqual([MediaType.MOVIES]);
        expect(getActiveMediaSettings(settings)).toEqual([settings[0]]);
        expect(resolveMediaTypeActive(settings, MediaType.MOVIES)).toBe(true);
        expect(resolveMediaTypeActive(settings, MediaType.ANIME)).toBe(false);
    });

    it.each([undefined, null, []])("treats missing settings as inactive", (missingSettings) => {
        expect(getActiveMediaSettings(missingSettings)).toEqual([]);
        expect(getActiveMediaTypes(missingSettings)).toEqual([]);
        expect(resolveMediaTypeActive(missingSettings, MediaType.MOVIES)).toBe(false);
    });

    it("treats an absent media type as inactive", () => {
        expect(resolveMediaTypeActive(settings, MediaType.GAMES)).toBe(false);
    });
});
