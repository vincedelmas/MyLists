import {describe, expect, it} from "vitest";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {addMediaToListSchema, editUserTagSchema, updateUserMediaSchema} from "@/lib/schemas/user-media.schema";


describe("user media schemas", () => {
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

    it("rejects blank tag names and canonicalizes surrounding whitespace", () => {
        expect(editUserTagSchema.safeParse({
            action: TagAction.ADD,
            mediaType: MediaType.MOVIES,
            tag: { name: "   " },
        }).success).toBe(false);

        expect(editUserTagSchema.parse({
            action: TagAction.RENAME,
            mediaType: MediaType.MOVIES,
            tag: { name: "  favorite  ", oldName: "  old  " },
        }).tag).toEqual({ name: "favorite", oldName: "old" });
    });

    it("rejects implausibly old backlog dates", () => {
        const result = updateUserMediaSchema.safeParse({
            mediaId: 1,
            mediaType: MediaType.ANIME,
            payload: {
                type: UpdateType.TV,
                currentEpisode: 1,
                loggedAt: "0008-11-30",
            },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({
                path: ["payload", "loggedAt"],
                message: "Date must be between 1900-01-01 and today.",
            }),
        ]));
    });
});
