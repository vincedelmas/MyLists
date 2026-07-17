import {describe, expect, it} from "vitest";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import {jobDetailsPageSchema, libraryHistorySchema} from "@/lib/contracts/media/projections";


describe("supporting media projection contracts", () => {
    it("accepts the canonical camelCase history payload", () => {
        expect(libraryHistorySchema.safeParse([{
            id: 1,
            userId: 2,
            mediaId: 3,
            mediaName: "Example",
            mediaType: MediaType.MOVIES,
            updateType: UpdateType.STATUS,
            payload: { oldValue: null, newValue: "Completed" },
            timestamp: "2026-01-01 10:00:00",
        }]).success).toBe(true);
    });

    it("rejects job pages whose discriminator is missing", () => {
        expect(jobDetailsPageSchema.safeParse({ items: [], total: 0, pages: 0 }).success).toBe(false);
    });
});
