import {describe, expect, it} from "vitest";
import {getReleaseCalendarPeriod} from "./release-calendar.utils";
import {releaseCalendarRangeSchema, releaseCalendarSearchSchema} from "@/lib/schemas/release-calendar.schema";


describe("release calendar periods", () => {
    it.each([
        ["2026-02-15", "2026-01-26", "2026-03-01", 35],
        ["2024-02-29", "2024-01-29", "2024-03-03", 35],
        ["2026-08-31", "2026-07-27", "2026-09-06", 42],
        ["2027-02-01", "2027-02-01", "2027-02-28", 28],
        ["2026-12-31", "2026-11-30", "2027-01-03", 35],
    ])("includes complete weeks around month %s", (date, startDate, endDate, count) => {
        const period = getReleaseCalendarPeriod(date, "month");
        expect(period.startDate).toBe(startDate);
        expect(period.endDate).toBe(endDate);
        expect(period.days).toHaveLength(count);
        expect(new Set(period.days).size).toBe(count);
        expect(releaseCalendarRangeSchema.safeParse(period).success).toBe(true);
    });

    it.each([
        ["2026-12-31", "2026-12-28", "2027-01-03"],
        ["2026-03-29", "2026-03-23", "2026-03-29"],
        ["2026-10-25", "2026-10-19", "2026-10-25"],
    ])("keeps seven calendar days for week %s across year and DST boundaries", (date, startDate, endDate) => {
        const period = getReleaseCalendarPeriod(date, "week");
        expect(period.startDate).toBe(startDate);
        expect(period.endDate).toBe(endDate);
        expect(period.days).toHaveLength(7);
        expect(period.days[0]).toBe(startDate);
        expect(period.days[6]).toBe(endDate);
    });

    it("discards invalid URL filters and rejects reversed or oversized server ranges", () => {
        expect(releaseCalendarSearchSchema.parse({ date: "2026-02-30", view: "year", mediaType: "books" }))
            .toEqual({ date: undefined, view: undefined, mediaType: undefined });
        expect(releaseCalendarRangeSchema.safeParse({ startDate: "2026-02-02", endDate: "2026-02-01" }).success).toBe(false);
        expect(releaseCalendarRangeSchema.safeParse({ startDate: "2026-01-01", endDate: "2026-03-01" }).success).toBe(false);
    });
});
