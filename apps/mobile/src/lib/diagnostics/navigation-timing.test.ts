import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

let timing: typeof import("./navigation-timing");
let output: ReturnType<typeof vi.spyOn>;
beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout", "performance"]});
    vi.stubGlobal("__DEV__", true);
    vi.stubEnv("EXPO_PUBLIC_NAV_TIMING", "1");
    output = vi.spyOn(console, "info").mockImplementation(() => {});
    timing = await import("./navigation-timing");
});
afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});
const readReport = (index = 0) => JSON.parse(String(output.mock.calls[index][0]).replace("[nav-timing] ", ""));

describe("development navigation timing", () => {
    it("batches observations, separates finger-down time, and ignores the outgoing screen", () => {
        timing.beginNavigationTiming("/profile/social", "press-in");
        vi.advanceTimersByTime(80);
        timing.beginNavigationTiming("/profile/social", "navigation-requested");
        timing.recordNavigationTiming("react-mount", "/index", 200);
        vi.advanceTimersByTime(100);
        timing.recordNavigationTiming("transition-start", "/profile/social");
        expect(output).not.toHaveBeenCalled();
        vi.advanceTimersByTime(2820);
        expect(output).toHaveBeenCalledTimes(1);
        expect(readReport().events).toEqual([
            {phase: "press-in", atMs: 0},
            {phase: "navigation-requested", atMs: 80},
            {phase: "transition-start", atMs: 180},
        ]);
    });
    it("keeps late requests attached to their original navigation and strips query strings", () => {
        timing.beginNavigationTiming("/profile/social", "navigation-requested");
        const finish = timing.timeNavigationRequest("/social?private-search=secret");
        timing.beginNavigationTiming("/lists/books", "navigation-requested");
        vi.advanceTimersByTime(100);
        finish!("http-200");
        vi.advanceTimersByTime(3000);
        expect(readReport(0).requests).toEqual([{path: "/social", startMs: 0}]);
        expect(readReport(1).requests).toEqual([]);
        expect(output.mock.calls.join()).not.toContain("secret");
    });
    it("records navigation-tree renders on the active trace without needing a destination hook", () => {
        timing.recordNavigationTiming("navigation-tree-update", undefined, 220);
        timing.beginNavigationTiming("/profile/social", "navigation-requested");
        timing.recordNavigationTiming("navigation-tree-update", undefined, 220);
        vi.advanceTimersByTime(3000);
        expect(readReport().events).toContainEqual({phase: "navigation-tree-update", atMs: 0, renderMs: 220});
    });

    it("does not profile or schedule captures unless explicitly enabled", async () => {
        vi.stubEnv("EXPO_PUBLIC_NAV_TIMING", undefined);
        vi.resetModules();
        const disabled = await import("./navigation-timing");
        expect(disabled.navigationTimingEnabled).toBe(false);
        disabled.beginNavigationTiming("/profile/social", "navigation-requested");
        expect(disabled.timeNavigationRequest("/social")).toBeUndefined();
        expect(vi.getTimerCount()).toBe(0);
        expect(output).not.toHaveBeenCalled();
    });

    it("does not log or schedule anything in production", async () => {
        vi.stubGlobal("__DEV__", false);
        vi.resetModules();
        const production = await import("./navigation-timing");
        production.beginNavigationTiming("/profile/social", "navigation-requested");
        expect(production.timeNavigationRequest("/social")).toBeUndefined();
        vi.advanceTimersByTime(5000);
        expect(output).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });
});
