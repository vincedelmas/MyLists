import {describe, expect, it, vi} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {YEAR_RECAP_FIRST_YEAR} from "@/lib/types/year-recap.types";
import {YearRecapService} from "@/lib/server/domain/year-recap/year-recap.service";


describe("YearRecapService", () => {
    const year = YEAR_RECAP_FIRST_YEAR;
    const activities = [
        {
            mediaId: 1,
            mediaType: MediaType.BOOKS,
            monthBucket: `${year}-01`,
            progressGained: 100,
            redoGained: 0,
            hadCompletion: true,
        },
        {
            mediaId: 1,
            mediaType: MediaType.BOOKS,
            monthBucket: `${year}-02`,
            progressGained: 50,
            redoGained: 1,
            hadCompletion: false,
        },
        {
            mediaId: 2,
            mediaType: MediaType.MOVIES,
            monthBucket: `${year}-02`,
            progressGained: 1,
            redoGained: 0,
            hadCompletion: true,
        },
    ];

    const repository = {
        getYearRecapActivities: vi.fn((_userId: number, _year: number, mediaType?: MediaType) => {
            return activities.filter((activity) => !mediaType || activity.mediaType === mediaType);
        }),
        getYearRecapMediaTypes: vi.fn(() => [MediaType.BOOKS, MediaType.MOVIES]),
    };

    const registry = {
        get: (mediaType: MediaType) => ({
            progressToMinutes: (progress: number, duration?: number | null) => {
                return mediaType === MediaType.BOOKS ? progress * 1.7 : progress * (duration ?? 100);
            },
            getMediaByIds: async (ids: number[]) => ids.map((id) => ({
                id,
                duration: mediaType === MediaType.MOVIES ? 120 : null,
                name: mediaType === MediaType.BOOKS ? "The Book" : "The Movie",
                imageCover: `cover-${id}.jpg`,
            })),
        }),
    };

    const service = new YearRecapService(repository as any, registry as any);

    it("aggregates mixed media using time while preserving native progress", async () => {
        const recap = await service.getYearRecap(1, year, { isAvailable: true });

        expect(recap.scope).toBe("all");
        expect(recap.totals).toMatchObject({
            hours: 6.25,
            titleCount: 2,
            completions: 2,
            repeats: 1,
            activeMonths: 2,
            longestActiveStreak: 2,
        });
        expect(recap.topTitles.find(({ name }) => name === "The Book")).toMatchObject({
            progress: 150,
            progressUnit: "pages",
            activeMonths: 2,
        });
        expect(recap.busiestMonth?.month).toBe(`${year}-02`);
        expect(recap.media.map((item) => item.mediaType)).toEqual([MediaType.BOOKS, MediaType.MOVIES]);
    });

});
