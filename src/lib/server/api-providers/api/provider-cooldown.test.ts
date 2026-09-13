import {afterEach, describe, expect, it, vi} from "vitest";
import {ProviderRequestError} from "./provider-error";
import {checkProviderCooldown, setProviderCooldown} from "./provider-cooldown";


vi.mock("@/env/server", () => ({ serverEnv: { REDIS_ENABLED: false, LOG_LEVEL: "silent" } }));


describe("provider cooldowns", () => {
    afterEach(() => vi.useRealTimers());

    it("shares cooldowns, preserves the longest wait, and releases only the affected provider at expiry", async () => {
        vi.useFakeTimers();
        const now = Date.now();
        const error = new ProviderRequestError("Quota reached", {
            provider: "cooldown-test", statusCode: 429, kind: "quota", retryAt: now + 60_000, reason: "dailyLimitExceeded",
        });
        await setProviderCooldown(error);
        await setProviderCooldown(new ProviderRequestError("Short wait", { ...error.details, retryAt: now + 1_000 }));
        await expect(checkProviderCooldown("cooldown-test")).rejects.toMatchObject({ details: error.details });
        await expect(checkProviderCooldown("other-provider")).resolves.toBeUndefined();
        vi.setSystemTime(now + 60_000);
        await expect(checkProviderCooldown("cooldown-test")).resolves.toBeUndefined();
    });
});
