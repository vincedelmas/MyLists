import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    session: vi.fn(),
    container: vi.fn(),
    calendar: vi.fn(),
    user: vi.fn(),
    decide: vi.fn(),
}));

vi.mock("@tanstack/react-router", async importOriginal => ({
    ...await importOriginal<typeof import("@tanstack/react-router")>(),
    createFileRoute: (path: string) => (options: object) => ({ path, options }),
}));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "http://localhost:3000" } }));
vi.mock("@/lib/server/core/request-user", () => ({ getRequestUser: mocks.session }));
vi.mock("@/lib/server/core/container", () => ({ getContainer: mocks.container }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/server/mobile/calendar", () => ({ getMobileCalendar: mocks.calendar }));

type Handler = (input: { request: Request; params: Record<string, string> }) => Response | Promise<Response>;
type RouteModule = { Route: { path: string; options: { server: { handlers: Record<string, Handler> } } } };

// Discover real route handlers so new mobile endpoints automatically join the authentication audit.
const modules = import.meta.glob<RouteModule>("../../../routes/api/mobile/**/*.ts", { eager: true });
const routes = Object.values(modules).map(module => module.Route);
const endpoints = routes.flatMap(route => Object.entries(route.options.server.handlers).map(([method, handler]) => ({ path: route.path, method, handler })));
const params = { userId: "20", mediaType: "movies", mediaId: "1", section: "details" };

const call = (endpoint: typeof endpoints[number], query = "", headers: HeadersInit = {}) => {
    const path = endpoint.path.replace(/\$(\w+)/g, (_, key: string) => params[key as keyof typeof params]);
    return endpoint.handler({
        request: new Request(`http://localhost:3000${path}${query}`, {
            method: endpoint.method,
            headers: { "content-type": "application/json", ...headers },
            ...(endpoint.method !== "GET" ? { body: "{}" } : {}),
        }),
        params,
    });
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue(undefined);
    mocks.container.mockImplementation(() => {
        throw new Error("Unauthenticated data access");
    });
    mocks.calendar.mockResolvedValue({ mediaTypes: [], items: [] });
});

describe("authentication on every mobile API endpoint", () => {
    it.each(endpoints)("rejects anonymous $method $path before loading data", async endpoint => {
        const response = await call(endpoint, "?userId=20", { cookie: "mylists.session_token=forged-or-revoked" });
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: { message: "Sign in to continue." } });
        expect(mocks.session).toHaveBeenCalledOnce();
        expect(mocks.container).not.toHaveBeenCalled();
        expect(mocks.calendar).not.toHaveBeenCalled();
        expect(response.headers.get("cache-control")).toBe("private, no-store");
    });
});

describe("mobile resource authorization", () => {
    const profileResources = endpoints.filter(endpoint => endpoint.method === "GET" && (
        endpoint.path.startsWith("/api/mobile/v1/profile/") && !endpoint.path.endsWith("/calendar") && !endpoint.path.endsWith("/monthly-activity/media-search")
        || endpoint.path.startsWith("/api/mobile/v1/lists/$mediaType")
        || (endpoint.path.startsWith("/api/mobile/v1/library/") && !endpoint.path.endsWith("/manage"))
        || endpoint.path === "/api/mobile/v1/social/"
    ));

    it.each(profileResources)("denies $path when access to the selected profile is revoked", async endpoint => {
        mocks.session.mockResolvedValue({ id: 10 });
        mocks.user.mockResolvedValue({ id: 20, privacy: "private" });
        mocks.decide.mockResolvedValue({ allowed: false, reason: "profile-private" });
        mocks.container.mockResolvedValue({ services: { account: { getUserById: mocks.user }, authorization: { decideProfile: mocks.decide } } });
        const response = await call(endpoint, "?userId=20");
        expect(response.status).toBe(403);
        expect(mocks.decide).toHaveBeenCalledWith({ kind: "user", id: 10, role: "user" }, { id: 20, privacy: "private" });
    });

    const calendar = endpoints.find(endpoint => endpoint.path === "/api/mobile/v1/profile/calendar")!;
    const activityOwnerEndpoints = endpoints.filter(endpoint => endpoint.path === "/api/mobile/v1/library/manage" || endpoint.path.startsWith("/api/mobile/v1/profile/monthly-activity/") && (endpoint.method === "POST" || endpoint.path.endsWith("/media-search")));
    it.each(activityOwnerEndpoints)("rejects another user's $method $path before looking up their profile", async endpoint => {
        mocks.session.mockResolvedValue({ id: 10 });
        const response = await call(endpoint, "?userId=20");
        expect(response.status).toBe(403);
        expect(mocks.container).not.toHaveBeenCalled();
    });
    it("rejects another user's calendar before looking up their profile, even if it is public", async () => {
        mocks.session.mockResolvedValue({ id: 10 });
        const response = await call(calendar, "?userId=20&startDate=2026-10-01&endDate=2026-10-31");
        expect(response.status).toBe(403);
        expect(mocks.container).not.toHaveBeenCalled();
        expect(mocks.calendar).not.toHaveBeenCalled();
    });

    it.each(["", "&userId=10"])("loads only the authenticated user's calendar (%s)", async subject => {
        mocks.session.mockResolvedValue({ id: 10 });
        const response = await call(calendar, `?startDate=2026-10-01&endDate=2026-10-31${subject}`);
        expect(response.status).toBe(200);
        expect(mocks.calendar).toHaveBeenCalledWith(10, { startDate: "2026-10-01", endDate: "2026-10-31" }, 10);
        expect(mocks.container).not.toHaveBeenCalled();
    });
});
