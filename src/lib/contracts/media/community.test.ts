import {describe, expect, it} from "vitest";
import {communityActivityPageSchema} from "@/lib/contracts/media/community";
import {MediaType, RatingSystemType, Status} from "@/lib/utils/enums";


const movieEntry = {
    kind: MediaType.MOVIES,
    id: 10,
    userId: 20,
    mediaId: 30,
    status: Status.COMPLETED,
    favorite: false,
    comment: null,
    rating: 8,
    customCover: null,
    addedAt: null,
    lastUpdated: null,
    ratingSystem: RatingSystemType.SCORE,
    tags: [],
    rewatchCount: 1,
    watchCount: 2,
};

const page = {
    kind: MediaType.MOVIES,
    page: 1,
    items: [{
        kind: MediaType.MOVIES,
        id: 20,
        name: "viewer",
        image: null,
        ratingSystem: RatingSystemType.SCORE,
        userMedia: movieEntry,
    }],
    total: 1,
    perPage: 8,
    pages: 1,
    stats: {
        total: 1,
        totalRedo: 1,
        likedCount: 0,
        totalSpecific: 2,
        totalPlaytime: 0,
        completedCount: 1,
        averageRating: 8,
    },
};


describe("community activity contracts", () => {
    it("accepts a coherent family projection", () => {
        expect(communityActivityPageSchema.safeParse(page).success).toBe(true);
    });

    it("rejects a library entry whose family disagrees with its projection", () => {
        const result = communityActivityPageSchema.safeParse({
            ...page,
            items: [{
                ...page.items[0],
                userMedia: { ...movieEntry, kind: MediaType.GAMES },
            }],
        });

        expect(result.success).toBe(false);
    });
});
