import {describe, expect, it} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import {
    compactHistogramBins,
    fillMonthlyActivityTimeline,
    formatHistogramBin,
    formatHistogramOverflowBin,
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
        )).toBe("1–2 h");
        expect(formatHistogramBin(
            { start: 5000, endExclusive: null, value: 2 },
            "h",
            "continuous",
        )).toBe("5000+ h");
    });

    it("keeps every bin when the histogram already fits", () => {
        const bins = Array.from({ length: 8 }, (_, index) => ({
            start: 2 ** index,
            endExclusive: 2 ** (index + 1),
            value: index === 7 ? 1 : 10,
        }));

        const result = compactHistogramBins(bins);

        expect(result).toHaveLength(8);
        expect(result.every(({ overflow }) => overflow === null)).toBe(true);
        expect(result.at(-1)?.bin).toEqual({ start: 128, endExclusive: 256, value: 1 });
    });

    it("groups the weighted p95 tail only when more than twelve bins are needed", () => {
        const bins = Array.from({ length: 13 }, (_, index) => ({
            start: index * 10,
            endExclusive: (index + 1) * 10,
            value: index < 10 ? 10 : [2, 2, 1][index - 10],
        }));

        const result = compactHistogramBins(bins);

        expect(result).toHaveLength(11);
        expect(result.at(-1)).toEqual({
            bin: { start: 100, endExclusive: 130, value: 5 },
            overflow: "upper",
            sourceBinCount: 3,
        });
        expect(formatHistogramOverflowBin(result.at(-1)!.bin, "upper", "min")).toBe("100+ min");
        expect(result.reduce((sum, item) => sum + item.bin.value, 0)).toBe(105);
    });

    it("groups the weighted lower tail for chronological distributions", () => {
        const bins = Array.from({ length: 13 }, (_, index) => ({
            start: 1900 + index * 10,
            endExclusive: 1910 + index * 10,
            value: index < 3 ? [1, 2, 2][index] : 10,
        }));

        const result = compactHistogramBins(bins, { tailDirection: "lower" });

        expect(result[0]).toEqual({
            bin: { start: 1900, endExclusive: 1930, value: 5 },
            overflow: "lower",
            sourceBinCount: 3,
        });
        expect(formatHistogramOverflowBin(result[0].bin, "lower")).toBe("Before 1930");
        expect(result.reduce((sum, item) => sum + item.bin.value, 0)).toBe(105);
    });

    it("caps compacted histograms at twelve bars using positional groups", () => {
        const bins = Array.from({ length: 18 }, (_, index) => ({
            start: index * 10,
            endExclusive: (index + 1) * 10,
            value: 1,
        }));

        const result = compactHistogramBins(bins, { percentile: 1 });

        expect(result.length).toBeLessThanOrEqual(12);
        expect(result[0]).toEqual({
            bin: { start: 0, endExclusive: 20, value: 2 },
            overflow: null,
            sourceBinCount: 2,
        });
        expect(result.at(-1)).toEqual({
            bin: { start: 160, endExclusive: 180, value: 2 },
            overflow: null,
            sourceBinCount: 2,
        });
        expect(result.reduce((sum, item) => sum + item.bin.value, 0)).toBe(18);
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
