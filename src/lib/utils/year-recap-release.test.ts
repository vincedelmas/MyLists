import {describe, expect, it} from "vitest";

import {getYearRecapReleaseStatus} from "@/lib/utils/year-recap-release";


describe("getYearRecapReleaseStatus", () => {
    it("automatically releases the current year on December 20 UTC", () => {
        expect(getYearRecapReleaseStatus(2026, "automatic", new Date("2026-12-19T23:59:59.999Z")).isAvailable)
            .toBe(false);
        expect(getYearRecapReleaseStatus(2026, "automatic", new Date("2026-12-20T00:00:00.000Z")).isAvailable)
            .toBe(true);
    });

    it("honors enabled and disabled overrides for the current year", () => {
        const now = new Date("2026-08-15T12:00:00.000Z");

        expect(getYearRecapReleaseStatus(2026, "enabled", now).isAvailable).toBe(true);
        expect(getYearRecapReleaseStatus(2026, "disabled", now).isAvailable).toBe(false);
    });

    it("allows completed years to be disabled and keeps future years unavailable", () => {
        const now = new Date("2026-12-25T12:00:00.000Z");

        expect(getYearRecapReleaseStatus(2025, "automatic", now).isAvailable).toBe(true);
        expect(getYearRecapReleaseStatus(2025, "disabled", now).isAvailable).toBe(false);
        expect(getYearRecapReleaseStatus(2027, "enabled", now).isAvailable).toBe(false);
    });
});
