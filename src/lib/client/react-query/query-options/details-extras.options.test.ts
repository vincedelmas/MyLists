import {describe, expect, it, vi} from "vitest";
import {JobType, MediaType} from "@/lib/utils/enums";


const api = vi.hoisted(() => ({
    activity: vi.fn(async () => ({ source: "activity" })),
    collections: vi.fn(async () => ({ source: "collections" })),
    jobs: vi.fn(async () => ({ source: "jobs" })),
    platforms: vi.fn(async () => ({ source: "platforms" })),
}));

vi.mock("@/lib/server/functions/media-details", () => ({
    getMediaCommunityActivity: api.activity,
    getJobDetails: api.jobs,
    getGameCompatiblePlatforms: api.platforms,
    getMediaDetails: vi.fn(),
    getMediaDetailsToEdit: vi.fn(),
    resolveExternalMedia: vi.fn(),
}));
vi.mock("@/lib/server/functions/trends", () => ({ getTrendsMedia: vi.fn() }));
vi.mock("@/lib/server/functions/coming-next", () => ({ getComingNextMedia: vi.fn() }));
vi.mock("@/lib/server/functions/admin", () => ({ getAdminAllUpdatesHistory: vi.fn() }));
vi.mock("@/lib/server/functions/collections", () => ({
    getMediaCommunityCollections: api.collections,
    getCommunityCollections: vi.fn(),
    getEditCollectionDetails: vi.fn(),
    getPaginatedUserCollections: vi.fn(),
    getReadCollectionDetails: vi.fn(),
    getUserCollectionMemberships: vi.fn(),
}));

const {
    gameCompatiblePlatformsOptions,
    jobDetailsOptions,
    mediaCommunityActivityOptions,
} = await import("./media.options");
const {mediaCommunityCollectionsOptions} = await import("./collections.options");


describe("details extra query options", () => {
    it("owns distinct keys and error messages for every independently loaded projection", () => {
        const options = [
            mediaCommunityActivityOptions(42, MediaType.GAMES, 7),
            mediaCommunityCollectionsOptions(42, MediaType.GAMES),
            jobDetailsOptions(MediaType.GAMES, JobType.PUBLISHER, "Studio", { page: 1 }),
            gameCompatiblePlatformsOptions(42, true),
        ];
        expect(new Set(options.map(({ queryKey }) => JSON.stringify(queryKey))).size).toBe(4);
        expect(options.map(({ meta }) => meta?.errorToastMessage)).toEqual([
            "Community activity could not be loaded.",
            "Community collections could not be loaded.",
            "Contributor details could not be loaded.",
            "Compatible game platforms could not be loaded.",
        ]);
    });

    it("keeps a community-collections failure independent from activity, jobs, and platforms", async () => {
        api.collections.mockRejectedValueOnce(new Error("collections unavailable"));
        const activity = mediaCommunityActivityOptions(42, MediaType.GAMES, null);
        const collections = mediaCommunityCollectionsOptions(42, MediaType.GAMES);
        const jobs = jobDetailsOptions(MediaType.GAMES, JobType.PUBLISHER, "Studio", { page: 1 });
        const platforms = gameCompatiblePlatformsOptions(42, true);

        await expect(runQuery(activity.queryFn)).resolves.toEqual({ source: "activity" });
        await expect(runQuery(collections.queryFn)).rejects.toThrow("collections unavailable");
        await expect(runQuery(jobs.queryFn)).resolves.toEqual({ source: "jobs" });
        await expect(runQuery(platforms.queryFn)).resolves.toEqual({ source: "platforms" });
    });
});


const runQuery = (queryFn: unknown) => {
    if (typeof queryFn !== "function") throw new Error("Query option has no query function.");
    return queryFn({});
};
