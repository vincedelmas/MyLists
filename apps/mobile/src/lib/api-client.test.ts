import {afterEach, describe, expect, it, vi} from "vitest";
import {api, ApiError, assetUrl} from "./api-client";


const mocks = vi.hoisted(() => ({getCookie: vi.fn(), notify: vi.fn()}));
vi.mock("./config", () => ({backendUrl: "http://192.168.1.61:3000"}));
vi.mock("./auth-client", () => ({authClient: {getCookie: mocks.getCookie, $store: {notify: mocks.notify}}}));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
});

describe("native API transport", () => {
    it("sends the secure-store session cookie to the isolated mobile API", async () => {
        mocks.getCookie.mockResolvedValue("mylists.session_token=example");
        const fetcher = vi.fn().mockResolvedValue(Response.json({user: {id: 10}}));
        vi.stubGlobal("fetch", fetcher);
        await api.profile();
        expect(fetcher).toHaveBeenCalledWith("http://192.168.1.61:3000/api/mobile/v1/profile", expect.objectContaining({
            credentials: "omit", headers: {accept: "application/json", cookie: "mylists.session_token=example"},
        }));
        expect(assetUrl("/static/avatar.jpg")).toBe("http://192.168.1.61:3000/static/avatar.jpg");
    });

    it("notifies the reactive session store when a session expires", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({error: {message: "Sign in to continue."}}, {status: 401})));
        await expect(api.profile()).rejects.toBeInstanceOf(ApiError);
        expect(mocks.notify).toHaveBeenCalledWith("$sessionSignal");
    });

    it("keeps activity independently cancellable", async () => {
        const fetcher = vi.fn().mockResolvedValue(Response.json([]));
        vi.stubGlobal("fetch", fetcher);
        const controller = new AbortController();
        await api.profileActivity(controller.signal);
        const [url, options] = fetcher.mock.calls[0];
        expect(url).toBe("http://192.168.1.61:3000/api/mobile/v1/profile/activity");
        controller.abort();
        expect(options.signal.aborted).toBe(true);
    });
});
