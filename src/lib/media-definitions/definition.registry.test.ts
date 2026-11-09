import {describe, expect, it} from "vitest";
import {mediaStatusSchema} from "@/lib/schemas/media-status.schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "./definition.registry";


describe("shared media status policy", () => {
    it.each([
        [MediaType.SERIES, [Status.IN_PROGRESS, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLANNED]],
        [MediaType.ANIME, [Status.IN_PROGRESS, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLANNED]],
        [MediaType.MOVIES, [Status.COMPLETED, Status.PLANNED]],
        [MediaType.BOOKS, [Status.IN_PROGRESS, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLANNED]],
        [MediaType.GAMES, [Status.IN_PROGRESS, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER, Status.ON_HOLD, Status.DROPPED, Status.PLANNED]],
        [MediaType.MANGA, [Status.IN_PROGRESS, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLANNED]],
    ])("preserves status choices, order and backend validation for %s", (mediaType, expectedStatuses) => {
        expect(getMediaDefinition(mediaType).statuses).toEqual(expectedStatuses);
        const validator = mediaStatusSchema(mediaType);
        for (const status of Object.values(Status)) {
            expect(validator.safeParse(status).success).toBe(expectedStatuses.some(expected => expected === status));
        }
    });

    it("preserves the media display order and includes every registered type once", () => {
        expect(ALL_MEDIA_TYPES).toEqual([MediaType.SERIES, MediaType.ANIME, MediaType.MOVIES, MediaType.BOOKS, MediaType.GAMES, MediaType.MANGA]);
        expect([...ALL_MEDIA_TYPES].sort()).toEqual(Object.values(MediaType).sort());
        for (const mediaType of ALL_MEDIA_TYPES) expect(getMediaDefinition(mediaType).identity.mediaType).toBe(mediaType);
    });
});
