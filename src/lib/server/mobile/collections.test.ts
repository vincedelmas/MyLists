import {beforeEach, describe, expect, it, vi} from "vitest";
import {actOnMobileCommunityCollection, getMobileCommunityCollection, getMobileCommunityCollections, mobileCollectionActionSchema} from "./collections";


const mocks = vi.hoisted(() => ({
    user: vi.fn(),
    browse: vi.fn(),
    detail: vi.fn(),
    like: vi.fn(),
    copy: vi.fn(),
    view: vi.fn()
}));


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            account: { getUserById: mocks.user },
            collections: {
                getPublicCollections: mocks.browse,
                getCollectionDetails: mocks.detail,
                toggleLike: mocks.like,
                copyCollection: mocks.copy,
                recordCollectionView: mocks.view
            },
        },
    }),
}));


beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: 10, role: "user", ratingSystem: "score" });
});


describe("mobile community collections", () => {
    it("uses the web public-collection service and converts instance images for the phone", async () => {
        mocks.browse.mockResolvedValue({
            total: 1,
            pages: 1,
            items: [
                {
                    id: 7,
                    ownerImage: "http://localhost:3000/images/user.png",
                    previews: [
                        { mediaId: 3, mediaType: "series", mediaCover: "http://localhost:3000/images/cover.jpg" }
                    ]
                }
            ]
        });
        const result = await getMobileCommunityCollections(10, { page: 2, search: "favorites", mediaType: "series" });

        expect(mocks.browse).toHaveBeenCalledWith({ page: 2, search: "favorites", mediaType: "series" }, { kind: "user", id: 10, role: "user" });
        expect(result.items[0].ownerImage).toBe("/images/user.png");
        expect(result.items[0].previews[0].mediaCover).toBe("/images/cover.jpg");
    });

    it("delegates private collection access to the existing web policy before reading items", async () => {
        mocks.detail.mockRejectedValue(new Error("Collection is private"));

        await expect(getMobileCommunityCollection(10, { collectionId: 7, page: 1 })).rejects.toThrow("private");
        expect(mocks.detail).toHaveBeenCalledWith(7, "read", { kind: "user", id: 10, role: "user" }, { page: 1 }, undefined);
    });

    it("preserves admin identity and returns viewer ratings, ranking and annotations", async () => {
        mocks.user.mockResolvedValue({ id: 10, role: "admin", ratingSystem: "feeling" });
        mocks.detail.mockResolvedValue({
            collection: { id: 7, ownerId: 20, ownerImage: null },
            items: [
                {
                    mediaId: 3,
                    mediaType: "series",
                    mediaName: "Series",
                    mediaCover: "http://localhost:3000/images/cover.jpg",
                    status: "Completed",
                    rating: 8,
                    favorite: true,
                    annotation: "Best season",
                    orderIndex: 2,
                    userMedia: { comment: "Good" }
                }
            ]
        });
        const result = await getMobileCommunityCollection(10, {
            collectionId: 7,
            page: 2,
            search: "Series",
            library: "in"
        });

        expect(mocks.detail).toHaveBeenCalledWith(7, "read", { kind: "user", id: 10, role: "admin" }, { page: 2, search: "Series", library: "in" }, undefined);
        expect(result).toMatchObject({
            isOwn: false,
            ratingSystem: "feeling",
            items: [
                {
                    name: "Series",
                    cover: "/images/cover.jpg",
                    rating: 8,
                    hasComment: true,
                    annotation: "Best season",
                    orderIndex: 2
                }
            ]
        });
    });

    it.each(["like", "copy", "view"] as const)("uses the signed-in actor for %s actions", async action => {
        mocks.like.mockReturnValue({ isLiked: true, likeCount: 2 });
        mocks.copy.mockReturnValue({ id: 11 });
        await actOnMobileCommunityCollection(10, { collectionId: 7, action });

        expect(mocks[action]).toHaveBeenCalledWith(7, { kind: "user", id: 10, role: "user" });
    });

    it("rejects forged owner/actor fields in collection actions", () => {
        expect(() => mobileCollectionActionSchema.parse({ collectionId: 7, action: "copy", userId: 20 })).toThrow();
    });
});
