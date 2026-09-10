import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {editMediaDetailsPayloadSchemas, editMediaDetailsSchema} from "./media-details.schema";


describe("metadata edit validation", () => {
    it.each(Object.values(MediaType))("accepts partial edits for %s", (mediaType) => {
        expect(editMediaDetailsSchema.parse({ mediaType, mediaId: "1", payload: { name: " Updated title " } })).toEqual({
            mediaType, mediaId: 1, payload: { name: "Updated title" },
        });
    });

    it("normalizes form numbers, booleans and blank nullable values", () => {
        expect(editMediaDetailsSchema.parse({
            mediaType: MediaType.MOVIES, mediaId: 1,
            payload: { duration: " 120 ", budget: "0", revenue: "12.5", lockStatus: "false", releaseDate: "", homepage: " ", imageCover: "" },
        }).payload).toEqual({
            duration: 120, budget: 0, revenue: 12.5, lockStatus: false, releaseDate: null, homepage: null, imageCover: undefined,
        });
        expect(editMediaDetailsPayloadSchemas[MediaType.GAMES].parse({ hltbMainTime: "2.5", hltbMainAndExtraTime: "" }))
            .toEqual({ hltbMainTime: 2.5, hltbMainAndExtraTime: null });
        expect(editMediaDetailsPayloadSchemas[MediaType.BOOKS].parse({ pages: "250", authors: "" }))
            .toEqual({ pages: 250, authors: "" });
        expect(editMediaDetailsPayloadSchemas[MediaType.MANGA].parse({ chapters: null, genres: [] }))
            .toEqual({ chapters: null, genres: [] });
    });

    it.each([
        [MediaType.MOVIES, { duration: -1 }],
        [MediaType.MOVIES, { duration: 1.5 }],
        [MediaType.MOVIES, { duration: "abc" }],
        [MediaType.MOVIES, { duration: "" }],
        [MediaType.MOVIES, { duration: null }],
        [MediaType.MOVIES, { duration: true }],
        [MediaType.MOVIES, { budget: [] }],
        [MediaType.MOVIES, { revenue: Infinity }],
        [MediaType.BOOKS, { pages: -1 }],
        [MediaType.BOOKS, { pages: 2.5 }],
        [MediaType.BOOKS, { authors: 42 }],
        [MediaType.BOOKS, { authors: null }],
        [MediaType.BOOKS, { authors: ["Author"] }],
        [MediaType.MANGA, { chapters: "-1" }],
        [MediaType.MANGA, { genres: "Drama" }],
        [MediaType.MANGA, { genres: [{ name: 42 }] }],
        [MediaType.MANGA, { genres: [" "] }],
        [MediaType.MANGA, { genres: [{ name: "Drama", mediaId: 2 }] }],
        [MediaType.GAMES, { hltbMainTime: -1 }],
        [MediaType.MOVIES, { name: " " }],
        [MediaType.MOVIES, { synopsis: {} }],
        [MediaType.MOVIES, { lockStatus: "yes" }],
        [MediaType.MOVIES, { lockStatus: 1 }],
        [MediaType.MOVIES, { lockStatus: null }],
        [MediaType.MOVIES, { lockStatus: "" }],
        [MediaType.MOVIES, { lockStatus: " " }],
        [MediaType.MOVIES, { imageCover: "ftp://example.com/cover.jpg" }],
        [MediaType.MOVIES, { homepage: "not a URL" }],
        [MediaType.MOVIES, { releaseDate: "2025-02-30" }],
        [MediaType.SERIES, { lastAirDate: "yesterday" }],
        [MediaType.MOVIES, { pages: 250 }],
        [MediaType.MOVIES, { apiId: 2 }],
        [MediaType.MOVIES, { id: 2 }],
        [MediaType.MOVIES, { voteAverage: 10 }],
    ])("rejects invalid or unsupported metadata for %s: %j", (mediaType, payload) => {
        expect(editMediaDetailsSchema.safeParse({ mediaType, mediaId: 1, payload }).success).toBe(false);
    });

    it("keeps field errors under the payload and accepts real dates and HTTP URLs", () => {
        const result = editMediaDetailsSchema.safeParse({ mediaType: MediaType.MOVIES, mediaId: 1, payload: { duration: -1 } });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues[0].path).toEqual(["payload", "duration"]);

        expect(editMediaDetailsPayloadSchemas[MediaType.ANIME].parse({
            releaseDate: "2024-02-29", lastAirDate: null, homepage: "https://example.com", lockStatus: "true",
        })).toEqual({ releaseDate: "2024-02-29", lastAirDate: null, homepage: "https://example.com", lockStatus: true });
    });
});
