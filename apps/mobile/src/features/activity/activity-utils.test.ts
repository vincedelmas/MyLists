import {describe, expect, it} from "vitest";
import {formatActivityProgress, getActivitySignals, isFutureActivityPeriod, parseActivityAmount, shiftActivityPeriod} from "./activity-utils";
import {toActivityStoredValue} from "@/lib/utils/media/activity";

describe("phone monthly activity", () => {
    it("navigates across year boundaries without losing the view", () => {
        expect(shiftActivityPeriod({ year: 2026, month: 1, view: "month" }, -1)).toEqual({ year: 2025, month: 12, view: "month" });
        expect(shiftActivityPeriod({ year: 2026, month: 12, view: "month" }, 1)).toEqual({ year: 2027, month: 1, view: "month" });
        expect(shiftActivityPeriod({ year: 2026, month: 10, view: "year" }, -1)).toEqual({ year: 2025, month: 10, view: "year" });
    });
    it("allows the current year but not future months or years", () => {
        const now = new Date(2026, 9, 26);
        expect(isFutureActivityPeriod({ year: 2026, month: 12, view: "year" }, now)).toBe(false);
        expect(isFutureActivityPeriod({ year: 2026, month: 11, view: "month" }, now)).toBe(true);
        expect(isFutureActivityPeriod({ year: 2027, month: 1, view: "year" }, now)).toBe(true);
    });
    it("displays game hours and stores minutes, including decimal-comma keyboard input", () => {
        expect(formatActivityProgress({ mediaType: "games", progressGained: 150 })).toBe("2.5 h.");
        expect(toActivityStoredValue("games", parseActivityAmount("2,5"))).toBe(150);
        expect(parseActivityAmount(" ")).toBeNaN();
        expect(parseActivityAmount("oops")).toBeNaN();
        expect(parseActivityAmount("0")).toBe(0);
    });
    it("shows all monthly contributions but only the latest yearly state, like web", () => {
        const row = { hidden: false, hadCompletion: true, redoGained: 2, progressGained: 5 };
        expect(getActivitySignals(row, "month")).toEqual(["Completed", "Re-experienced ×2", "Progressed"]);
        expect(getActivitySignals(row, "year")).toEqual(["Completed"]);
        expect(getActivitySignals({
            ...row,
            occurrences: [{ ...row, id: 1, monthBucket: "2026-10", lastActivityAt: "2026-10-01", timeGained: 10, hadCompletion: false }]
        }, "year")).toEqual(["Re-experienced ×2"]);
        expect(getActivitySignals({ ...row, hidden: true }, "month")).toEqual(["Hidden"]);
    });
});
