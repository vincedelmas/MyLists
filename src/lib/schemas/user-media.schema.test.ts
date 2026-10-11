import {describe, expect, it} from "vitest";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {addMediaToListSchema, editUserTagSchema, updateUserCustomCoverSchema, updateUserMediaSchema} from "@/lib/schemas/user-media.schema";
import {updateBookCoverSchema} from "@/lib/schemas/media-details.schema";
import {MAX_IMAGE_BYTES} from "@/lib/utils/constants";


describe.each([
    { name: "custom cover", schema: updateUserCustomCoverSchema, fields: { mediaType: MediaType.MOVIES, mediaId: 1 } },
    { name: "book cover", schema: updateBookCoverSchema, fields: { mediaId: 1 } },
])("$name input", ({ schema, fields }) => {

    it("limits uploads to non-empty files up to 10MB", () => {
        for (const size of [0, MAX_IMAGE_BYTES + 1]) {
            const imageFile = new File([new Uint8Array(size)], "cover.png");
            expect(schema.safeParse({ ...fields, imageFile }).success).toBe(false);
        }
        const imageFile = new File([new Uint8Array(MAX_IMAGE_BYTES)], "cover.png");
        expect(schema.safeParse({ ...fields, imageFile }).success).toBe(true);
    });
});


describe("tag edits", () => {
    const fields = { mediaType: MediaType.MOVIES, tag: { name: "Favorites" } };

    it("preserves exact names when addressing existing tags", () => {
        expect(editUserTagSchema.parse({ ...fields, action: TagAction.RENAME,
            tag: { name: "Favorites", oldName: "  Old name  " },
        }).tag).toEqual({ name: "Favorites", oldName: "  Old name  " });
        expect(editUserTagSchema.parse({ ...fields, action: TagAction.DELETE_ALL,
            tag: { name: "  Old name  " },
        }).tag.name).toBe("  Old name  ");
    });

    it("requires the rename source and the media assignment to delete", () => {
        expect(editUserTagSchema.safeParse({ ...fields, action: TagAction.RENAME }).success).toBe(false);
        expect(editUserTagSchema.safeParse({ ...fields, action: TagAction.DELETE_ONE }).success).toBe(false);
        expect(editUserTagSchema.safeParse({ ...fields, action: TagAction.DELETE_ONE, mediaId: 1 }).success).toBe(true);
    });

});


describe("user media schemas", () => {
    it("accepts a complete TV position in one update while rejecting unrelated combined fields", () => {
        const parse = (payload: unknown) => updateUserMediaSchema.safeParse({ mediaType: MediaType.ANIME, mediaId: 1, payload });
        expect(parse({ type: UpdateType.TV, currentSeason: 2, currentEpisode: 12 }).success).toBe(true);
        expect(parse({ type: UpdateType.TV, currentSeason: 2, currentEpisode: 12, rating: 8 }).success).toBe(false);
        expect(parse({ type: UpdateType.TV, currentSeason: 2, actualPage: 12 }).success).toBe(false);
        expect(parse({ type: UpdateType.TV }).success).toBe(false);
    });

    it("rejects incompatible statuses when adding media to a list", () => {
        const result = addMediaToListSchema.safeParse({
            mediaId: 1,
            status: Status.PLAYING,
            mediaType: MediaType.MOVIES,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]).toMatchObject({
            path: ["status"],
            message: expect.stringContaining("Status is not valid for movies"),
        });
    });

    it("rejects incompatible statuses when updating user media", () => {
        const result = updateUserMediaSchema.safeParse({
            mediaId: 1,
            mediaType: MediaType.MOVIES,
            payload: {
                status: Status.PLAYING,
                type: UpdateType.STATUS,
            },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: ["payload", "status"],
                message: expect.stringContaining("Status is not valid for movies"),
            }),
        ]));
    });

    it("rejects update payload fields that do not match the update type", () => {
        const result = updateUserMediaSchema.safeParse({
            mediaId: 1,
            mediaType: MediaType.MOVIES,
            payload: {
                type: UpdateType.COMMENT,
                status: Status.COMPLETED,
            },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: ["payload", "status"],
                message: "Field \"status\" is not valid for update type \"comment\".",
            }),
        ]));
    });

    it("requires season-keyed rewatch progress for TV and scalar progress for other media", () => {
        const parseRedo = (mediaType: MediaType, redo: number | number[]) => updateUserMediaSchema.safeParse({
            mediaId: 1,
            mediaType,
            payload: {
                redo,
                type: UpdateType.REDO,
            },
        });

        expect(updateUserMediaSchema.safeParse({ mediaId: 1, mediaType: MediaType.SERIES,
            payload: { type: UpdateType.REDO, seasonRedos: [{ season: 1, redo: 1 }, { season: 2, redo: 0 }] },
        }).success).toBe(true);
        expect(parseRedo(MediaType.MOVIES, 1).success).toBe(true);
        expect(parseRedo(MediaType.ANIME, 1).success).toBe(false);
        expect(parseRedo(MediaType.BOOKS, [1]).success).toBe(false);
    });

    it("validates seasonal ratings and rejects duplicate season updates", () => {
        const parse = (mediaType: MediaType, payload: unknown) => updateUserMediaSchema.safeParse({ mediaId: 1, mediaType, payload });
        expect(parse(MediaType.ANIME, { type: UpdateType.RATING, seasonRating: { season: 1, rating: 0 } }).success).toBe(true);
        expect(parse(MediaType.SERIES, { type: UpdateType.RATING, seasonRating: { season: 1, rating: null } }).success).toBe(true);
        expect(parse(MediaType.MOVIES, { type: UpdateType.RATING, seasonRating: { season: 1, rating: 9 } }).success).toBe(false);
        expect(parse(MediaType.SERIES, { type: UpdateType.RATING, seasonRating: { season: 0, rating: 9 } }).success).toBe(false);
        expect(parse(MediaType.SERIES, { type: UpdateType.RATING, seasonRating: { season: 1, rating: 11 } }).success).toBe(false);
        expect(parse(MediaType.SERIES, { type: UpdateType.REDO, seasonRedos: [{ season: 1, redo: 1 }, { season: 1, redo: 2 }] }).success).toBe(false);
    });

    it("applies shared update limits", () => {
        const result = updateUserMediaSchema.safeParse({
            mediaId: 1,
            mediaType: MediaType.MOVIES,
            payload: {
                type: UpdateType.COMMENT,
                comment: "x".repeat(5001),
            },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: ["payload", "comment"],
                message: "Comment cannot exceed 5000 characters",
            }),
        ]));
    });

});
