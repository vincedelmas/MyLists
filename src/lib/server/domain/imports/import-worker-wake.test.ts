import {afterEach, describe, expect, it, vi} from "vitest";
import {createImportWorkerWakeSignal} from "@/lib/server/domain/imports/import-worker-wake";


describe("createImportWorkerWakeSignal", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("retains a wake notification that arrives before the worker waits", async () => {
        const wakeSignal = createImportWorkerWakeSignal();
        const controller = new AbortController();

        wakeSignal.wake();

        await expect(wakeSignal.wait(300_000, controller.signal)).resolves.toBe("wake");
    });

    it("wakes a worker that is already waiting", async () => {
        const wakeSignal = createImportWorkerWakeSignal();
        const controller = new AbortController();
        const waiting = wakeSignal.wait(300_000, controller.signal);

        wakeSignal.wake();

        await expect(waiting).resolves.toBe("wake");
    });

    it("coalesces multiple pending notifications into one wake", async () => {
        vi.useFakeTimers();
        const wakeSignal = createImportWorkerWakeSignal();
        const controller = new AbortController();

        wakeSignal.wake();
        wakeSignal.wake();

        await expect(wakeSignal.wait(300_000, controller.signal)).resolves.toBe("wake");

        const nextWait = wakeSignal.wait(300_000, controller.signal);
        await vi.advanceTimersByTimeAsync(300_000);
        await expect(nextWait).resolves.toBe("fallback");
    });

    it("releases the worker immediately during shutdown", async () => {
        const wakeSignal = createImportWorkerWakeSignal();
        const controller = new AbortController();
        const waiting = wakeSignal.wait(300_000, controller.signal);

        controller.abort();

        await expect(waiting).resolves.toBe("abort");
    });
});
