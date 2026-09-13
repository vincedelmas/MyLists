import {afterEach, describe, expect, it, vi} from "vitest";
import {acquireProviderSlot} from "./provider-concurrency";


vi.mock("@/env/server", () => ({ serverEnv: { REDIS_ENABLED: false, LOG_LEVEL: "silent" } }));


describe("provider concurrency", () => {
    afterEach(() => vi.useRealTimers());

    it("shares eight slots between callers, queues the ninth, and releases capacity", async () => {
        const signal = new AbortController().signal;
        const releases = await Promise.all(Array.from({ length: 8 }, () => acquireProviderSlot("eight-slots", 8, signal, 100_000)));
        let admitted = false;
        const ninth = acquireProviderSlot("eight-slots", 8, signal, 100_000).then(release => {
            admitted = true;
            return release;
        });
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(admitted).toBe(false);
        await releases.pop()!();
        releases.push(await ninth);
        expect(admitted).toBe(true);
        await Promise.all(releases.map(release => release()));
    });

    it("expires abandoned leases without letting an old release remove a replacement", async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        const now = Date.now();
        const releaseOld = await acquireProviderSlot("expired-slot", 1, new AbortController().signal, 100);
        vi.setSystemTime(now + 1_101);
        const releaseNew = await acquireProviderSlot("expired-slot", 1, new AbortController().signal, 100_000);
        await releaseOld();
        const abort = new AbortController();
        const pending = acquireProviderSlot("expired-slot", 1, abort.signal, 100_000);
        const assertion = expect(pending).rejects.toMatchObject({ name: "AbortError" });
        abort.abort();
        await assertion;
        await releaseNew();
    });
});
