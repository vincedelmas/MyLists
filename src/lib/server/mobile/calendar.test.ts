import {beforeEach, describe, expect, it, vi} from "vitest";
import {getMobileCalendar} from "./calendar";
import {releaseCalendarRangeSchema} from "@/lib/schemas/release-calendar.schema";


const mocks = vi.hoisted(() => ({
    settings: vi.fn(),
    get: vi.fn(),
    movies: vi.fn(),
    series: vi.fn()
}));


vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));


vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "uploads" } }));


vi.mock("@/lib/server/core/container", () => ({
    getContainer: async () => ({
        services: { account: { getMinimalUserSettings: mocks.settings } },
        registries: { mediaService: { get: mocks.get } },
    }),
}));


const range = { startDate: "2026-10-01", endDate: "2026-10-31" };


beforeEach(() => {
    vi.resetAllMocks();
    mocks.settings.mockResolvedValue([
        { mediaType: "movies", active: true },
        { mediaType: "series", active: true },
        { mediaType: "games", active: false },
        { mediaType: "books", active: true },
    ]);
    mocks.get.mockImplementation((type) => ({
        getReleaseCalendarMedia: type === "movies" ? mocks.movies : mocks.series,
    }));
    mocks.movies.mockResolvedValue([
        {
            mediaType: "movies",
            mediaId: 1,
            mediaName: "Movie",
            date: "2026-10-20",
            imageCover: "movie.jpg"
        },
    ]);
    mocks.series.mockResolvedValue([
        {
            mediaType: "series",
            mediaId: 2,
            mediaName: "Series",
            date: "2026-10-02",
            imageCover: "series.jpg"
        },
    ]);
});


describe("mobile release calendar", () => {
    it("rejects visitors before loading another user's release calendar", async () => {
        await expect(getMobileCalendar(20, range, 10)).rejects.toThrow("private");
        expect(mocks.settings).not.toHaveBeenCalled();
        expect(mocks.get).not.toHaveBeenCalled();
    });
    it("reads releases for the session owner and only active supported media", async () => {
        const data = await getMobileCalendar(10, range);
        expect(mocks.settings).toHaveBeenCalledWith(10);
        expect(data.mediaTypes).toEqual(["series", "movies"]);
        expect(mocks.get.mock.calls.flat()).toEqual(["series", "movies"]);
        expect(mocks.movies).toHaveBeenCalledWith(10, range);
        expect(mocks.series).toHaveBeenCalledWith(10, range);
        expect(data.items.map((item) => item.mediaId)).toEqual([2, 1]);
        expect(data.items[1].cover).toMatch(/^\/uploads\/.+\/movie\.jpg$/);
    });

    it("returns an empty agenda without reading inactive lists", async () => {
        mocks.settings.mockResolvedValue([
            { mediaType: "movies", active: false }
        ]);
        expect(await getMobileCalendar(10, range)).toEqual({
            mediaTypes: [],
            items: []
        });
        expect(mocks.get).not.toHaveBeenCalled();
    });

    it("rejects reversed and oversized calendar ranges", () => {
        expect(releaseCalendarRangeSchema.safeParse(range).success).toBe(true);
        expect(
            releaseCalendarRangeSchema.safeParse({ startDate: range.endDate, endDate: range.startDate }).success,
        )
            .toBe(false);
        expect(releaseCalendarRangeSchema.safeParse({ ...range, endDate: "2026-12-31" }).success).toBe(false);
    });
});
