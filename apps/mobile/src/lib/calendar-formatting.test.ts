import {afterEach, describe, expect, it, vi} from "vitest";
import {formatCalendarRelativeLabel} from "./calendar-formatting";

afterEach(() => vi.unstubAllGlobals());
describe("mobile calendar labels", () => {
    const now = new Date(2026, 9, 27, 23, 59);
    it.each([
        ["2026-10-27", "today"], ["2026-10-28", "tomorrow"], ["2026-10-26", "yesterday"],
        ["2026-10-31", "in 4 days"], ["2026-10-23", "4 days ago"], ["2026-11-03", "next week"],
        ["2026-11-10", "in 2 weeks"], ["2026-12-26", "in 2 months"], ["2028-10-27", "in 2 years"],
        [null, "Upcoming"],
    ])("formats %s without depending on relative-time Intl support", (date, expected) => {
        vi.stubGlobal("Intl", Object.create(Intl, { RelativeTimeFormat: { value: undefined } }));
        expect(formatCalendarRelativeLabel(date, now)).toBe(expected);
    });
});
