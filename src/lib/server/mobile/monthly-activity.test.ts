import {beforeEach, describe, expect, it, vi} from "vitest";
import {
    getMobileMonthlyActivity,
    getMobileMonthlyActivityStats,
    mobileMonthlyActivityMutationSchema,
    mobileMonthlyActivitySchema,
    mutateMobileMonthlyActivity,
    searchMobileActivityMedia
} from "./monthly-activity";

const mocks = vi.hoisted(() => ({ rows: vi.fn(), stats: vi.fn(), settings: vi.fn(), search: vi.fn(), get: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: {
            account: { getMinimalUserSettings: mocks.settings },
            activity: {
                getMonthlyActivity: mocks.rows,
                getMonthlyActivityStats: mocks.stats,
                addMonthlyActivity: mocks.add,
                updateMonthlyActivity: mocks.update,
                removeFromMonth: mocks.remove
            }
        },
        registries: { mediaMonthlyActivity: { get: mocks.get } },
    })
}));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.rows.mockResolvedValue({ items: [{ id: 7, mediaCover: "http://localhost:3000/uploads/books/cover.jpg" }], pages: 1, total: 1 });
    mocks.settings.mockResolvedValue([{ mediaType: "games", active: false }, { mediaType: "books", active: true }, { mediaType: "series", active: true }]);
    mocks.get.mockReturnValue({ searchUserMedia: mocks.search });
});
const period = { year: 2026, month: 10, view: "month" as const };

describe("mobile monthly activity", () => {
    it("parses false URL flags as false and shares the web filter validation", () => {
        const filters = mobileMonthlyActivitySchema.parse({ ...period, hiddenOnly: "false", activeTab: "books", activityKind: "redo", sort: "time_desc" });
        expect(filters).toMatchObject({ hiddenOnly: false, page: 1, activeTab: "books", activityKind: "redo", sort: "time_desc" });
        expect(mobileMonthlyActivitySchema.parse({ ...period, hiddenOnly: "true" }).hiddenOnly).toBe(true);
        expect(mobileMonthlyActivitySchema.safeParse({ ...period, month: 13 }).success).toBe(false);
    });

    it("keeps all web filters, scopes hidden access to the owner, and converts covers", async () => {
        const filters = mobileMonthlyActivitySchema.parse({ ...period, hiddenOnly: true });
        const result = await getMobileMonthlyActivity(10, filters);
        expect(mocks.rows).toHaveBeenCalledWith(10, filters, true);
        expect(result.canEdit).toBe(true);
        expect(result.activeMediaTypes).toEqual(["series", "books"]);
        expect(result.items[0].mediaCover).toBe("/uploads/books/cover.jpg");
    });

    it("denies a visitor's hidden-only query before loading activity", async () => {
        await expect(getMobileMonthlyActivity(20, mobileMonthlyActivitySchema.parse({ ...period, hiddenOnly: true }), 10)).rejects.toThrow("private");
        expect(mocks.rows).not.toHaveBeenCalled();
        expect(mocks.settings).not.toHaveBeenCalled();
    });

    it("lets an authorized visitor read visible summaries without edit or hidden privileges", async () => {
        const filters = mobileMonthlyActivitySchema.parse(period);
        expect((await getMobileMonthlyActivity(20, filters, 10)).canEdit).toBe(false);
        expect(mocks.rows).toHaveBeenCalledWith(20, filters, false);
    });

    it("keeps statistics independent of result filters and orders media canonically", async () => {
        mocks.stats.mockResolvedValue({ totalTime: 90, mediaStats: [{ mediaType: "games", timeGained: 70 }, { mediaType: "series", timeGained: 20 }] });
        const result = await getMobileMonthlyActivityStats(10, period);
        expect(mocks.stats).toHaveBeenCalledWith(10, period);
        expect(result.mediaStats.map(item => item.mediaType)).toEqual(["series", "games"]);
    });

    it("searches only the authenticated actor's tracked media and respects custom covers", async () => {
        mocks.search.mockResolvedValue([{ mediaId: 3, mediaName: "Book", mediaCover: "/uploads/books/default.jpg", customCover: "/uploads/custom/book.jpg" }]);
        expect(await searchMobileActivityMedia(10, { mediaType: "books", query: " Book " })).toEqual([{ mediaId: 3, mediaName: "Book", cover: "/uploads/custom/book.jpg" }]);
        expect(mocks.search).toHaveBeenCalledWith(10, "Book", 20);
    });

    it("never derives a mutation's actor from the payload", async () => {
        const add = mobileMonthlyActivityMutationSchema.parse({
            action: "add",
            userId: 20,
            data: {
                userId: 20,
                mediaId: 3,
                mediaType: "games",
                progressGained: 150,
                redoGained: 0,
                hadCompletion: false,
                hidden: false,
                lastActivityAt: "2026-01-01T12:00:00.000Z"
            }
        });
        await mutateMobileMonthlyActivity(10, add);
        expect(mocks.add).toHaveBeenCalledWith(10, expect.not.objectContaining({ userId: 20 }));
        await mutateMobileMonthlyActivity(10, { action: "update", activityId: 88, payload: { hidden: true } });
        expect(mocks.update).toHaveBeenCalledWith(10, 88, { hidden: true });
        await mutateMobileMonthlyActivity(10, { action: "remove", activityId: 88 });
        expect(mocks.remove).toHaveBeenCalledWith(10, 88);
    });
});
