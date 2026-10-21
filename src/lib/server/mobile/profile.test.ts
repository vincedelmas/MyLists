import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileProfile, getMobileProfileActivity} from "./profile";
import {mobileRequest} from "./request";


const mocks = vi.hoisted(() => ({
    session: vi.fn(), user: vi.fn(), social: vi.fn(), stats: vi.fn(), lists: vi.fn(), highlights: vi.fn(), activity: vi.fn(),
}));
vi.mock("@/env/client", () => ({clientEnv: {VITE_BASE_URL: "http://localhost:3000"}}));
vi.mock("@/lib/server/core/auth", () => ({auth: {api: {getSession: mocks.session}}}));
vi.mock("@/lib/server/core/logger", () => ({logger: {warn: vi.fn(), error: vi.fn()}}));
vi.mock("@/lib/server/core/container", () => ({getContainer: async () => ({
    cacheManager: {},
    services: {
        account: {getUserById: mocks.user, updateUserLastSeen: async () => {}},
        social: {getFollowCount: mocks.social},
        stats: {userPreComputedStatsSummary: mocks.stats, userPerMediaSummaryStats: mocks.lists},
        profile: {resolveHighlightedMedia: mocks.highlights},
        updateHistory: {getUserUpdates: mocks.activity},
    },
})}));

const request = () => new Request("http://localhost:3000/api/mobile/v1/profile?userId=999", {
    headers: {cookie: "mylists.session_token=example"},
});

beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({user: {id: "10", role: "user"}});
    mocks.user.mockResolvedValue({
        id: 10, name: "owner", privacy: "private", ratingSystem: "score", email: "private@example.invalid",
        createdAt: "2026-10-20 12:00:00", image: "http://localhost:3000/static/avatar.jpg",
        backgroundImage: "http://localhost:3000/static/background.jpg",
    });
    mocks.social.mockResolvedValue({followsCount: 1, followersCount: 2});
    mocks.stats.mockResolvedValue({totalEntries: 3, totalHours: 4, totalFavorites: 2, totalRated: 1, avgRated: 8, totalComments: 99});
    mocks.lists.mockResolvedValue([{mediaType: "movies", entriesFavorites: 2, timeSpent: 4, totalEntries: 3, statusList: []}]);
    mocks.highlights.mockResolvedValue({overview: {title: "Highlights", mode: "curated", items: [
        {mediaId: 7, mediaType: "movies", mediaName: "A movie", mediaCover: "http://localhost:3000/static/cover.jpg", releaseDate: "2026-01-01"},
    ]}});
    mocks.activity.mockResolvedValue([{id: 1, userId: 10, timestamp: "2026-10-21 14:00:00"}]);
});

describe("isolated mobile profile API", () => {
    it("uses the verified session ID and returns only the mobile overview fields", async () => {
        const req = request();
        const response = await mobileRequest(req, getMobileProfile);
        expect(response.status).toBe(200);
        expect(mocks.session).toHaveBeenCalledWith({headers: req.headers, query: {disableCookieCache: true}});
        expect(mocks.user).toHaveBeenCalledWith(10);
        expect(await response.json()).toEqual({
            user: {
                id: 10, name: "owner", privacy: "private", ratingSystem: "score", createdAt: "2026-10-20T12:00:00.000Z",
                image: "/static/avatar.jpg", backgroundImage: "/static/background.jpg",
            },
            social: {followsCount: 1, followersCount: 2},
            stats: {totalEntries: 3, totalHours: 4, totalFavorites: 2, totalRated: 1, avgRated: 8},
            lists: [{mediaType: "movies", entriesFavorites: 2, timeSpent: 4, totalEntries: 3}],
            highlights: {title: "Highlights", mode: "curated", items: [{mediaId: 7, mediaType: "movies", mediaName: "A movie", mediaCover: "/static/cover.jpg"}]},
        });
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(response.headers.get("vary")).toBe("Cookie");
        expect(mocks.activity).not.toHaveBeenCalled();
    });

    it("loads activity independently with native-compatible UTC timestamps", async () => {
        const response = await mobileRequest(request(), getMobileProfileActivity);
        expect(await response.json()).toEqual([{id: 1, userId: 10, timestamp: "2026-10-21T14:00:00.000Z"}]);
        expect(mocks.activity).toHaveBeenCalledWith(10);
        expect(mocks.stats).not.toHaveBeenCalled();
        expect(mocks.highlights).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests before loading any data", async () => {
        mocks.session.mockResolvedValue(null);
        for (const reader of [getMobileProfile, getMobileProfileActivity]) {
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
        mocks.stats.mockRejectedValue(new Error("private database details"));
        const response = await mobileRequest(request(), getMobileProfile);
        expect(response.status).toBe(500);
        expect(await response.text()).not.toContain("private database details");
    });
});
