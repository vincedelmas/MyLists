import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getMobileProfile,
    getMobileProfileActivity,
    getMobileProfileExtras,
    getMobileAchievements,
    getMobileRecentAchievements,
    getMobileStats,
} from "./profile";
import { mobileRequest } from "./request";

const mocks = vi.hoisted(() => ({
    earned: vi.fn(),
    avatars: vi.fn(),
    catalog: vi.fn(),
    feed: vi.fn(),
    advanced: vi.fn(),
    wrap: vi.fn(),
    session: vi.fn(),
    user: vi.fn(),
    social: vi.fn(),
    stats: vi.fn(),
    lists: vi.fn(),
    highlights: vi.fn(),
    activity: vi.fn(),
}));
vi.mock("./activity", () => ({
    withMobileActivityCovers: (items: readonly Record<string, unknown>[]) =>
        items.map((item) => ({ ...item, cover: null })),
}));
vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => ({ select: () => ({ from: () => ({ where: () => ({ all: mocks.avatars }) }) }) }),
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        cacheManager: { wrap: mocks.wrap },
        services: {
            account: { getUserById: mocks.user, updateUserLastSeen: async () => {} },
            social: { getFollowCount: mocks.social },
            achievements: { getAchievementsDetails: mocks.earned, getUserAchievements: mocks.catalog },
            stats: {
                userAdvancedSummaryStats: mocks.advanced,
                userPreComputedStatsSummary: mocks.stats,
                userPerMediaSummaryStats: mocks.lists,
            },
            profile: { resolveHighlightedMedia: mocks.highlights },
            updateHistory: { getUserUpdates: mocks.activity, getFollowsUpdates: mocks.feed },
        },
    }),
}));

const request = () =>
    new Request("http://localhost:3000/api/mobile/v1/profile?userId=999", {
        headers: { cookie: "mylists.session_token=example" },
    });

beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({ user: { id: "10", role: "user" } });
    mocks.user.mockResolvedValue({
        userMediaSettings: [{ mediaType: "movies", active: true }],
        id: 10,
        name: "owner",
        privacy: "private",
        ratingSystem: "score",
        email: "private@example.invalid",
        createdAt: "2026-10-20 12:00:00",
        image: "http://localhost:3000/static/avatar.jpg",
        backgroundImage: "http://localhost:3000/static/background.jpg",
    });
    mocks.earned.mockResolvedValue([]);
    mocks.avatars.mockReturnValue([]);
    mocks.feed.mockResolvedValue([]);
    mocks.catalog.mockResolvedValue([]);
    mocks.wrap.mockImplementation((_key, loader) => loader());
    mocks.social.mockResolvedValue({ followsCount: 1, followersCount: 2 });
    mocks.stats.mockResolvedValue({
        totalEntries: 3,
        totalHours: 4,
        totalFavorites: 2,
        totalRated: 1,
        avgRated: 8,
        totalComments: 99,
    });
    mocks.lists.mockResolvedValue([
        { mediaType: "movies", entriesFavorites: 2, timeSpent: 4, totalEntries: 3, statusList: [] },
    ]);
    mocks.highlights.mockResolvedValue({
        overview: {
            title: "Highlights",
            mode: "curated",
            items: [
                {
                    mediaId: 7,
                    mediaType: "movies",
                    mediaName: "A movie",
                    mediaCover: "http://localhost:3000/static/cover.jpg",
                    releaseDate: "2026-01-01",
                },
            ],
        },
    });
    mocks.activity.mockResolvedValue([{ id: 1, userId: 10, timestamp: "2026-10-21 14:00:00" }]);
});

describe("isolated mobile profile API", () => {
    it("uses the verified session ID and returns only the mobile overview fields", async () => {
        const req = request();
        const response = await mobileRequest(req, getMobileProfile);
        expect(response.status).toBe(200);
        expect(mocks.session).toHaveBeenCalledWith({ headers: req.headers, query: { disableCookieCache: true } });
        expect(mocks.user).toHaveBeenCalledWith(10);
        expect(mocks.stats).not.toHaveBeenCalled();
        expect(mocks.highlights).not.toHaveBeenCalled();
        expect(await response.json()).toEqual({
            user: {
                id: 10,
                name: "owner",
                privacy: "private",
                ratingSystem: "score",
                createdAt: "2026-10-20T12:00:00.000Z",
                image: "/static/avatar.jpg",
                backgroundImage: "/static/background.jpg",
            },
            social: { followsCount: 1, followersCount: 2 },
            lists: [{ mediaType: "movies", entriesFavorites: 2, timeSpent: 4, totalEntries: 3, level: 3 }],
        });
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(response.headers.get("vary")).toBe("Cookie");
        expect(mocks.activity).not.toHaveBeenCalled();
    });

    it("loads the follows feed independently and applies visibility for the verified actor", async () => {
        await getMobileProfileExtras(10);
        expect(mocks.earned).not.toHaveBeenCalled();
        expect(mocks.feed).toHaveBeenCalledWith(10, { kind: "user", id: 10, role: "user" }, 10);
    });

    it("filters a visited user's follows feed using the visitor, rather than impersonating the subject", async () => {
        await getMobileProfileExtras(20, 10);
        expect(mocks.feed).toHaveBeenCalledWith(20, { kind: "user", id: 10, role: "user" }, 10);
    });

    it("attaches the author's avatar and rating preference without changing the saved payload", async () => {
        const payload = { old_value: 0, new_value: 8 };
        mocks.feed.mockResolvedValue([
            {
                id: 7,
                userId: 20,
                username: "Other",
                mediaType: "movies",
                mediaId: 1,
                payload,
                timestamp: "2026-10-21 14:00:00",
            },
        ]);
        mocks.avatars.mockReturnValue([{ id: 20, image: "http://localhost:3000/avatar.jpg", ratingSystem: "feeling" }]);
        expect((await getMobileProfileExtras(10)).followsFeed[0]).toMatchObject({
            avatar: "/avatar.jpg",
            ratingSystem: "feeling",
            payload,
        });
    });

    it("loads only the three latest achievements when requested", async () => {
        mocks.earned.mockResolvedValue([{ id: 1, completedAt: "2026-10-21 14:00:00" }]);
        expect(await getMobileRecentAchievements(10)).toEqual([{ id: 1, completedAt: "2026-10-21T14:00:00.000Z" }]);
        expect(mocks.earned).toHaveBeenCalledWith(10, 3);
        expect(mocks.feed).not.toHaveBeenCalled();
    });

    it("keeps all achievement tiers on the full page and excludes inactive media", async () => {
        mocks.catalog.mockResolvedValue([
            { id: 1, mediaType: "movies", tiers: Array.from({ length: 5 }, (_, id) => ({ id, completedAt: null })) },
            { id: 2, mediaType: "games", tiers: [] },
        ]);
        const items = await getMobileAchievements(10);
        expect(items).toHaveLength(1);
        expect(items[0].tiers).toHaveLength(5);
    });

    it("uses advanced statistics and rejects inactive media before computing them", async () => {
        mocks.advanced.mockResolvedValue({ totalEntries: 5, activityByMonth: { data: [] } });
        expect(await getMobileStats(10)).toMatchObject({ kind: "overview", totalEntries: 5 });
        expect(mocks.advanced).toHaveBeenCalledWith(10);
        await expect(getMobileStats(10, "games")).rejects.toThrow();
    });

    it("loads activity independently with native-compatible UTC timestamps", async () => {
        const response = await mobileRequest(request(), getMobileProfileActivity);
        expect(await response.json()).toEqual([
            { id: 1, userId: 10, cover: null, timestamp: "2026-10-21T14:00:00.000Z" },
        ]);
        expect(mocks.activity).toHaveBeenCalledWith(10);
        expect(mocks.stats).not.toHaveBeenCalled();
        expect(mocks.highlights).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests before loading any data", async () => {
        mocks.session.mockResolvedValue(null);
        for (const reader of [
            getMobileProfile,
            getMobileProfileActivity,
            getMobileProfileExtras,
            getMobileAchievements,
            getMobileRecentAchievements,
            getMobileStats,
        ]) {
            expect((await mobileRequest(request(), reader)).status).toBe(401);
        }
        expect(mocks.user).not.toHaveBeenCalled();
        expect(mocks.activity).not.toHaveBeenCalled();
    });

    it("returns a missing-profile response without fetching its lists", async () => {
        mocks.user.mockResolvedValue(null);
        expect((await mobileRequest(request(), getMobileProfile)).status).toBe(404);
        expect(mocks.stats).not.toHaveBeenCalled();
    });

    it("keeps internal failures out of API error messages", async () => {
        mocks.lists.mockRejectedValue(new Error("private database details"));
        const response = await mobileRequest(request(), getMobileProfile);
        expect(response.status).toBe(500);
        expect(await response.text()).not.toContain("private database details");
    });
});
