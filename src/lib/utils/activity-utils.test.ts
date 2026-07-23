import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {calculateActivityTime, toActivityDisplayValue, toActivityStoredValue} from "@/lib/utils/activity-utils";


describe("activity utilities", () => {
    it("uses fixed reading times instead of a media duration", () => {
        expect(calculateActivityTime(MediaType.BOOKS, 10, 999)).toBe(17);
        expect(calculateActivityTime(MediaType.MANGA, 10, 999)).toBe(70);
    });

    it("uses media durations before the shared ingestion fallback", () => {
        expect(calculateActivityTime(MediaType.SERIES, 2, 40)).toBe(80);
        expect(calculateActivityTime(MediaType.ANIME, 2, 24)).toBe(48);
        expect(calculateActivityTime(MediaType.SERIES, 2)).toBe(80);
        expect(calculateActivityTime(MediaType.ANIME, 2)).toBe(48);
        expect(calculateActivityTime(MediaType.MOVIES, 2)).toBe(200);
    });

    it("stores game input as minutes and displays it as hours", () => {
        expect(toActivityStoredValue(MediaType.GAMES, 1.25)).toBe(75);
        expect(toActivityDisplayValue(MediaType.GAMES, 75)).toBe(1.25);
        expect(calculateActivityTime(MediaType.GAMES, 75, 999)).toBe(75);
    });
});
