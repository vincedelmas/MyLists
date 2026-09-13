import {afterEach, describe, expect, it, vi} from "vitest";
import {providerRequestContext} from "@/lib/server/core/provider-request-context";
import {consumeGoogleBooksQuota, getGoogleBooksQuotaWindow} from "./gbooks-quota";


vi.mock("@/env/server", () => ({ serverEnv: { REDIS_ENABLED: false, LOG_LEVEL: "silent" } }));


describe("Google Books daily quota", () => {
    afterEach(() => vi.useRealTimers());

    it.each([
        ["2026-01-10T12:00:00Z", "2026-01-11T08:00:00Z"],
        ["2026-07-10T12:00:00Z", "2026-07-11T07:00:00Z"],
        ["2026-03-08T07:59:00Z", "2026-03-08T08:00:00Z"],
        ["2026-03-08T08:00:00Z", "2026-03-09T07:00:00Z"],
        ["2026-11-01T06:59:00Z", "2026-11-01T07:00:00Z"],
        ["2026-11-01T07:00:00Z", "2026-11-02T08:00:00Z"],
    ])("resets at Pacific midnight from %s", (now, reset) => {
        expect(getGoogleBooksQuotaWindow(Date.parse(now)).resetAt).toBe(Date.parse(reset));
    });

    it("counts interactive traffic against import headroom, reserves 100 calls, and resets the next day", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
        for (let i = 0; i < 100; i++) await consumeGoogleBooksQuota();

        await providerRequestContext.run({ isImport: true }, async () => {
            const results = await Promise.allSettled(Array.from({ length: 801 }, () => consumeGoogleBooksQuota()));
            expect(results.filter(result => result.status === "fulfilled")).toHaveLength(800);
            expect(results.at(-1)).toMatchObject({ status: "rejected", reason: {
                details: { kind: "quota", reason: "importBudgetExceeded", retryAt: Date.parse("2026-06-02T07:00:00Z") },
            } });
        });

        for (let i = 0; i < 100; i++) await consumeGoogleBooksQuota();
        await expect(consumeGoogleBooksQuota()).rejects.toMatchObject({ details: { reason: "dailyLimitExceeded" } });
        vi.setSystemTime(new Date("2026-06-02T07:00:00Z"));
        await expect(consumeGoogleBooksQuota()).resolves.toBeUndefined();
    });
});
