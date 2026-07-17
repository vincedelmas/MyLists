import {describe, expect, it} from "vitest";
import {MEDIA_TYPES, MediaType, sortByMediaType} from "@/lib/utils/enums";


describe("media type ordering", () => {
    it("keeps the canonical order across unordered media records", () => {
        expect(MEDIA_TYPES).toEqual([
            MediaType.SERIES,
            MediaType.ANIME,
            MediaType.MOVIES,
            MediaType.BOOKS,
            MediaType.GAMES,
            MediaType.MANGA,
        ]);

        const records = [
            { mediaType: MediaType.GAMES },
            { mediaType: MediaType.ANIME },
            { mediaType: MediaType.MANGA },
            { mediaType: MediaType.SERIES },
        ];

        expect(sortByMediaType(records, ({ mediaType }) => mediaType).map(({ mediaType }) => mediaType)).toEqual([
            MediaType.SERIES,
            MediaType.ANIME,
            MediaType.GAMES,
            MediaType.MANGA,
        ]);
        expect(records[0].mediaType).toBe(MediaType.GAMES);
    });
});
