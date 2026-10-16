import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {editMediaDetailsPayloadSchemas, editMediaDetailsSchema} from "./media-details.schema";


describe("metadata edit validation", () => {

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
        [MediaType.BOOKS, { authors: 42 }],
        [MediaType.MANGA, { genres: [{ name: "Drama", mediaId: 2 }] }],
        [MediaType.GAMES, { hltbMainTime: -1 }],
        [MediaType.MOVIES, { lockStatus: "yes" }],
        [MediaType.MOVIES, { imageCover: "ftp://example.com/cover.jpg" }],
        [MediaType.MOVIES, { releaseDate: "2025-02-30" }],
        [MediaType.MOVIES, { pages: 250 }],
        [MediaType.MOVIES, { apiId: 2 }],
        [MediaType.MOVIES, { voteAverage: 10 }],
    ])("rejects invalid or unsupported metadata for %s: %j", (mediaType, payload) => {
        expect(editMediaDetailsSchema.safeParse({ mediaType, mediaId: 1, payload }).success).toBe(false);
    });

});
