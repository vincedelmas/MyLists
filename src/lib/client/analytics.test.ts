import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType} from "@/lib/utils/enums";


const sdk = vi.hoisted(() => ({ capture: vi.fn(), create: vi.fn() }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_PUBLIC_POSTHOG_KEY: "test-key" } }));
vi.mock("posthog-js-lite", () => ({
    default: class {
        capture = sdk.capture;
        constructor(...args: unknown[]) { sdk.create(...args); }
    },
}));

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("PROD", true);
    vi.stubGlobal("window", { location: { pathname: "/search" } });
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});


describe("analytics", () => {
    it("loads a single Lite client and captures events requested before initialization", async () => {
        const { captureEvent, loadAnalytics } = await import("./analytics");
        captureEvent("media_added", { media_type: MediaType.BOOKS, source: "quick_add" });
        await Promise.all([loadAnalytics(), loadAnalytics()]);

        expect(sdk.create).toHaveBeenCalledTimes(1);
        expect(sdk.create).toHaveBeenCalledWith("test-key", expect.objectContaining({
            host: "https://eu.i.posthog.com", autocapture: false, captureHistoryEvents: false,
            disableSurveys: true, disableRemoteFeatureFlags: true,
        }));
        expect(sdk.capture).toHaveBeenCalledWith("media_added", { media_type: MediaType.BOOKS, source: "quick_add" });
    });

    it.each(["development", "server", "password reset"])("does not load analytics during %s", async context => {
        if (context === "development") vi.stubEnv("PROD", false);
        if (context === "server") vi.stubGlobal("window", undefined);
        if (context === "password reset") vi.stubGlobal("window", { location: { pathname: "/reset-password" } });
        const { loadAnalytics } = await import("./analytics");
        expect(await loadAnalytics()).toBeNull();
        expect(sdk.create).not.toHaveBeenCalled();
    });

    it("does not turn an SDK loading failure into an unhandled rejection", async () => {
        sdk.create.mockImplementationOnce(() => { throw new Error("blocked"); });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { captureEvent } = await import("./analytics");
        captureEvent("media_added", { media_type: MediaType.BOOKS, source: "details" });
        await vi.waitFor(() => expect(warn).toHaveBeenCalled());
        expect(sdk.capture).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});
