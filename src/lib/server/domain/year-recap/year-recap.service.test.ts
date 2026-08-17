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

    it("recomputes the complete recap for an individual media scope", async () => {
        const recap = await service.getYearRecap(1, year, { mediaType: MediaType.MOVIES, isAvailable: true });

        expect(recap.scope).toBe(MediaType.MOVIES);
        expect(recap.totals).toMatchObject({ hours: 2, titleCount: 1, completions: 1 });
        expect(recap.topTitles).toHaveLength(1);
        expect(recap.comparison?.referenceLabel).toContain("Interstellar");
    });

    it("ranks first-time titles before repeats, then favorites, ratings, and tracked time", async () => {
        const rankingActivities = [
            { mediaId: 1, mediaType: MediaType.MOVIES, monthBucket: `${year}-01`, progressGained: 1, redoGained: 0, hadCompletion: true },
            { mediaId: 2, mediaType: MediaType.MOVIES, monthBucket: `${year}-02`, progressGained: 2, redoGained: 0, hadCompletion: true },
            { mediaId: 3, mediaType: MediaType.MOVIES, monthBucket: `${year}-03`, progressGained: 3, redoGained: 1, hadCompletion: false },
            { mediaId: 4, mediaType: MediaType.MOVIES, monthBucket: `${year}-04`, progressGained: 4, redoGained: 1, hadCompletion: false },
        ];
        const rankingRepository = {
            getYearRecapActivities: vi.fn(() => rankingActivities),
            getYearRecapMediaTypes: vi.fn(() => [MediaType.MOVIES]),
        };
        const titleDetails = new Map([
            [1, { name: "Original favorite", favorite: true, rating: 4 }],
            [2, { name: "Original high score", favorite: false, rating: 9 }],
            [3, { name: "Repeated favorite", favorite: true, rating: 10 }],
            [4, { name: "Repeated score", favorite: false, rating: 8 }],
        ]);
        const rankingRegistry = {
            get: () => ({
                progressToMinutes: (progress: number) => progress * 100,
                getMediaByIds: async (ids: number[]) => ids.map((id) => ({
                    id,
                    duration: 100,
                    imageCover: `cover-${id}.jpg`,
                    ...titleDetails.get(id),
                })),
            }),
        };
        const rankingService = new YearRecapService(rankingRepository as any, rankingRegistry as any);

        const recap = await rankingService.getYearRecap(1, year, { isAvailable: true });

        expect(recap.topTitles.map(({ name }) => name)).toEqual([
            "Original favorite",
            "Original high score",
            "Repeated favorite",
            "Repeated score",
        ]);
    });

    it("returns at most one six-title row", async () => {
        const manyActivities = Array.from({ length: 8 }, (_, index) => ({
            mediaId: index + 1,
            mediaType: MediaType.MOVIES,
            monthBucket: `${year}-01`,
            progressGained: 1,
            redoGained: 0,
            hadCompletion: true,
        }));
        const manyRepository = {
            getYearRecapActivities: vi.fn(() => manyActivities),
            getYearRecapMediaTypes: vi.fn(() => [MediaType.MOVIES]),
        };
        const manyService = new YearRecapService(manyRepository as any, registry as any);

        const recap = await manyService.getYearRecap(1, year, { isAvailable: true });

        expect(recap.topTitles).toHaveLength(6);
    });

    it("rejects a recap year that has not been released", async () => {
        const currentYear = new Date().getUTCFullYear();
        vi.clearAllMocks();

        await expect(service.getYearRecap(1, currentYear, { isAvailable: false })).rejects.toThrow(
            `${currentYear} recap is not available yet`,
        );
        expect(repository.getYearRecapActivities).not.toHaveBeenCalledWith(1, currentYear, undefined);
    });

    it("allows the current year once it is available", async () => {
        const currentYear = new Date().getUTCFullYear();

        await expect(service.getYearRecap(1, currentYear, { isAvailable: true })).resolves.toMatchObject({
            year: currentYear,
        });
    });
});
