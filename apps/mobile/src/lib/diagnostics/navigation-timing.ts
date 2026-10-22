// Development-only observations. These JS timestamps are not measurements of
// physical touch latency or proof that a frame has reached the phone's display.
export const navigationTimingEnabled =
    typeof __DEV__ !== "undefined" && __DEV__ && process.env.EXPO_PUBLIC_NAV_TIMING === "1";
const captureMs = 3_000;
let sequence = 0;
let current:
    | {
          id: number;
          route: string;
          startedAt: number;
          events: {phase: string; atMs: number; renderMs?: number}[];
          requests: {path: string; startMs: number; durationMs?: number; outcome?: string}[];
          timer: ReturnType<typeof setTimeout>;
      }
    | undefined;

const rounded = (value: number) => Math.round(value * 10) / 10;

function report(reason: "capture-ended" | "next-navigation") {
    if (!current) return;
    clearTimeout(current.timer);
    const {timer: _timer, startedAt: _startedAt, ...trace} = current;
    current = undefined;
    console.info(`[nav-timing] ${JSON.stringify({...trace, reason})}`);
}

export function beginNavigationTiming(route: string, phase: "press-in" | "navigation-requested") {
    if (!navigationTimingEnabled) return;
    if (
        phase === "press-in" ||
        current?.route !== route ||
        current.events.some((event) => event.phase === "navigation-requested")
    ) {
        report("next-navigation");
        current = {
            id: ++sequence,
            route,
            startedAt: performance.now(),
            events: [],
            requests: [],
            timer: setTimeout(() => report("capture-ended"), captureMs),
        };
    }
    recordNavigationTiming(phase, route);
}

export function recordNavigationTiming(phase: string, route?: string, renderMs?: number) {
    if (!navigationTimingEnabled || !current || (route !== undefined && current.route !== route)) return;
    current.events.push({
        phase,
        atMs: rounded(performance.now() - current.startedAt),
        ...(renderMs === undefined ? {} : {renderMs: rounded(renderMs)}),
    });
}

export function observeNavigationFrame(route: string) {
    if (!navigationTimingEnabled || !current || current.route !== route) return;
    const id = current.id;
    requestAnimationFrame(() => {
        if (current?.id === id) recordNavigationTiming("js-frame-after-layout", route);
    });
}

export function timeNavigationRequest(path: string) {
    const trace = current;
    if (!navigationTimingEnabled || !trace) return undefined;
    const startedAt = performance.now();
    const request: (typeof trace.requests)[number] = {
        path: path.split("?")[0],
        startMs: rounded(startedAt - trace.startedAt),
    };
    trace.requests.push(request);
    return (outcome: string) => {
        request.durationMs = rounded(performance.now() - startedAt);
        request.outcome = outcome;
    };
}
