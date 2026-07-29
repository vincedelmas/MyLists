import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {
    fillMonthlyActivityTimeline,
    formatHistogramBin,
    toHistogramBins,
    transformRatingToFeeling,
} from "@/lib/utils/stats-utils";


describe("stats utilities", () => {
    it("maps ratings by their score instead of their array position", () => {
        const result = transformRatingToFeeling([
            { name: "10.0", value: 2 },
            { name: "1.5", value: 3 },
            { name: "not-a-rating", value: 10 },
        ]);

        expect(result).toEqual([
            { name: 0, value: 0 },
            { name: 2, value: 3 },
            { name: 4, value: 0 },
            { name: 6, value: 0 },
            { name: 8, value: 0 },
            { name: 10, value: 2 },
        ]);
    });

    it("keeps histogram ranges tied to their bucket width when buckets are sparse", () => {
        const bins = toHistogramBins([
            { name: 60, value: 4 },
            { name: 120, value: 2 },
        ], (start) => start + 30);

        expect(bins).toEqual([
            { start: 60, endExclusive: 90, value: 4 },
            { start: 120, endExclusive: 150, value: 2 },
        ]);
        expect(bins.map((bin) => formatHistogramBin(bin, "min"))).toEqual([
            "60–89 min",
            "120–149 min",
        ]);
        expect(formatHistogramBin(
            { start: 1, endExclusive: 2, value: 4 },
            "h",
            "continuous",
        )).toBe("1–<2 h");
    });

    it("drops invalid histogram boundaries", () => {
        expect(toHistogramBins([
            { name: "unknown", value: 1 },
            { name: 10, value: 2 },
        ], (start) => start)).toEqual([]);
    });

    it("fills every month in the requested activity range, including trailing inactivity", () => {
        expect(fillMonthlyActivityTimeline({
            startMonth: "2026-01",
            endMonth: "2026-03",
            mediaTypes: [MediaType.BOOKS],
            data: [
                { month: "2026-01", total: 2, books: 2 },
            ],
        })).toEqual([
            { month: "2026-01", total: 2, books: 2 },
            { month: "2026-02", total: 0, books: 0 },
            { month: "2026-03", total: 0, books: 0 },
        ]);
    });
});
