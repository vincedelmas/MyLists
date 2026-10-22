import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, assetUrl } from "./api-client";

const mocks = vi.hoisted(() => ({ getCookie: vi.fn(), notify: vi.fn() }));
vi.mock("./config", () => ({ backendUrl: "http://192.168.1.61:3000" }));
vi.mock("./auth-client", () => ({ authClient: { getCookie: mocks.getCookie, $store: { notify: mocks.notify } } }));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
});

describe("native API transport", () => {
    it("sends the secure-store session cookie to the isolated mobile API", async () => {
        mocks.getCookie.mockResolvedValue("mylists.session_token=example");
        const fetcher = vi.fn().mockResolvedValue(Response.json({ user: { id: 10 } }));
        vi.stubGlobal("fetch", fetcher);
        await api.profile();
        expect(fetcher).toHaveBeenCalledWith(
            "http://192.168.1.61:3000/api/mobile/v1/profile",
            expect.objectContaining({
                credentials: "omit",
                headers: { accept: "application/json", cookie: "mylists.session_token=example" },
            }),
        );
        expect(assetUrl("/static/avatar.jpg")).toBe("http://192.168.1.61:3000/static/avatar.jpg");
    });

    it("notifies the reactive session store when a session expires", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(Response.json({ error: { message: "Sign in to continue." } }, { status: 401 })),
        );
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
    it("selects the visited subject on every profile reader without changing session identity", async () => {
        mocks.getCookie.mockResolvedValue("mylists.session_token=viewer");
        const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({})));
        vi.stubGlobal("fetch", fetcher);
        await Promise.all([
            api.profile(undefined, 20),
            api.profileActivity(undefined, 20),
            api.profileExtras(undefined, 20),
            api.history(2, undefined, 20),
            api.stats("overview", undefined, 20),
            api.achievements(undefined, 20),
            api.recentAchievements(undefined, 20),
            api.calendar({ startDate: "2026-10-01", endDate: "2026-10-31" }, undefined, 20),
            api.list("movies", {}, undefined, 20),
            api.social({ kind: "followers", page: 1 }, undefined, 20),
            api.libraryDetail({ kind: "continue", page: 1, search: "" }, undefined, 20),
        ]);
        expect(fetcher).toHaveBeenCalledTimes(11);
        for (const [url, options] of fetcher.mock.calls) {
            expect(new URL(url).searchParams.get("userId")).toBe("20");
            expect(options.headers.cookie).toBe("mylists.session_token=viewer");
        }
    });

    it("uses JSON mutations and keeps path parameters out of the editable payload", async () => {
        const fetcher = vi.fn().mockResolvedValue(Response.json({ kind: "saved" }));
        vi.stubGlobal("fetch", fetcher);
        await api.updateMedia({ mediaType: "books", mediaId: 7, payload: { type: "page", actualPage: 20 } });
        const [url, options] = fetcher.mock.calls[0];
        expect(url).toBe("http://192.168.1.61:3000/api/mobile/v1/media/books/7");
        expect(options.method).toBe("PATCH");
        expect(options.headers["content-type"]).toBe("application/json");
        expect(JSON.parse(options.body)).toEqual({ payload: { type: "page", actualPage: 20 } });
    });
});
