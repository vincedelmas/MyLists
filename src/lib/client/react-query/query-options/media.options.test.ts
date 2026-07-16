import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {mediaCommunityActivityKey, mediaDetailsKey, mediaDetailsRootKey} from "./media.keys";
import {setViewerCacheIdentity, viewerScopedKey} from "./viewer-cache";


describe("viewer-dependent media query keys", () => {
    it("does not share private detail payloads between anonymous and authenticated principals", () => {
        const anonymous = mediaDetailsKey(MediaType.SERIES, 42, null);
        const userOne = mediaDetailsKey(MediaType.SERIES, 42, 1);
        const userTwo = mediaDetailsKey(MediaType.SERIES, 42, 2);

        expect(new Set([JSON.stringify(anonymous), JSON.stringify(userOne), JSON.stringify(userTwo)]).size).toBe(3);
        expect(userOne.slice(0, 3)).toEqual(mediaDetailsRootKey(MediaType.SERIES, 42));
    });

    it("separates community audiences while keeping pagination in the key", () => {
        const anonymous = mediaCommunityActivityKey(42, MediaType.ANIME, null, { page: 1, perPage: 8 });
        const member = mediaCommunityActivityKey(42, MediaType.ANIME, 7, { page: 1, perPage: 8 });
        const nextPage = mediaCommunityActivityKey(42, MediaType.ANIME, 7, { page: 2, perPage: 8 });

        expect(anonymous).not.toEqual(member);
        expect(member).not.toEqual(nextPage);
    });

    it("partitions profile, library and collection payloads by the active principal", () => {
        setViewerCacheIdentity(null);
        const anonymous = [
            viewerScopedKey(["profile", "owner"]),
            viewerScopedKey(["userList", MediaType.MOVIES, "owner"]),
            viewerScopedKey(["collections", "details", 42]),
        ];
        setViewerCacheIdentity(7);
        const member = [
            viewerScopedKey(["profile", "owner"]),
            viewerScopedKey(["userList", MediaType.MOVIES, "owner"]),
            viewerScopedKey(["collections", "details", 42]),
        ];

        expect(anonymous.map((value) => JSON.stringify(value)))
            .not.toEqual(member.map((value) => JSON.stringify(value)));
        expect(viewerScopedKey(["example"]).at(-1)).toEqual({ viewer: 7 });
    });
});
