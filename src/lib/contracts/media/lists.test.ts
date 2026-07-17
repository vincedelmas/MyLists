import {describe, expect, it} from "vitest";
import {mediaListItemSchema, mediaListRequestSchema} from "@/lib/contracts/media/lists";
import {MediaType, RatingSystemType, Status} from "@/lib/utils/enums";


describe("media list contracts", () => {
    it("rejects filters from another media family", () => {
        const result = mediaListRequestSchema.safeParse({
            mediaType: MediaType.BOOKS,
            username: "reader",
            args: {
                page: 1,
                platforms: ["PC"],
            },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: "unrecognized_keys", path: ["args"], keys: ["platforms"] }),
        ]));
    });

    it("rejects statuses from another media family", () => {
        const result = mediaListRequestSchema.safeParse({
            mediaType: MediaType.MOVIES,
            username: "viewer",
            args: { status: [Status.PLAYING] },
        });

        expect(result.success).toBe(false);
    });

    it("requires item fields to agree with the discriminator", () => {
        const result = mediaListItemSchema.safeParse({
            kind: MediaType.MOVIES,
            id: 1,
            userId: 2,
            mediaId: 3,
            status: Status.COMPLETED,
            favorite: false,
            comment: null,
            rating: null,
            customCover: null,
            addedAt: null,
            lastUpdated: null,
            mediaName: "Film",
            imageCover: "cover.jpg",
            ratingSystem: RatingSystemType.SCORE,
            tags: [],
            common: false,
            playtime: 120,
            platform: "PC",
        });

        expect(result.success).toBe(false);
    });
});
