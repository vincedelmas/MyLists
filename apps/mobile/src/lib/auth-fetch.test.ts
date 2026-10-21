import {afterEach, describe, expect, it, vi} from "vitest";
import {splitSetCookieHeader} from "better-auth/cookies/utils";
import {authFetch} from "./auth-fetch";


afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("native auth transport", () => {
    it("discards changing browser cache cookies while preserving the authenticated session body", async () => {
        let reads = 0;
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({user: {id: "1"}}), {
            headers: {"set-cookie": `mylists.session_data=cache-${++reads}; Path=/; Max-Age=300`},
        })));

        for (let read = 0; read < 2; read++) {
            const response = await authFetch("http://localhost:3000/api/auth/get-session");
            expect(response.headers.has("set-cookie")).toBe(false);
            expect(await response.json()).toEqual({user: {id: "1"}});
        }
    });

    it("keeps token rotation and OAuth cookies while removing secure and chunked cache cookies", async () => {
        const cookies = [
            "__Secure-mylists.session_token=new-token; Path=/; HttpOnly; Secure",
            "__Secure-mylists.session_data.0=chunk-one; Path=/; Secure",
            "__Secure-mylists.session_data.1=chunk-two; Path=/; Secure",
            "mylists.oauth_state=oauth-state; Expires=Wed, 21 Oct 2026 16:00:00 GMT; Path=/",
        ];
        const headers = new Headers({"content-type": "application/json"});
        for (const cookie of cookies) headers.append("set-cookie", cookie);
        vi.stubGlobal("fetch", vi.fn(async () => new Response("null", {headers})));

        const response = await authFetch("http://localhost:3000/api/auth/get-session");
        expect(splitSetCookieHeader(response.headers.get("set-cookie")!)).toEqual([cookies[0], cookies[3]]);
        expect(await response.json()).toBeNull();
    });

    it("preserves responses that do not contain browser cache cookies", async () => {
        const original = new Response("null", {headers: {"set-cookie": "mylists.session_token=; Max-Age=0; Path=/"}});
        vi.stubGlobal("fetch", vi.fn(async () => original));

        expect(await authFetch("http://localhost:3000/api/auth/sign-out")).toBe(original);
    });

    it("times out even when the session client provides its own signal", async () => {
        vi.useFakeTimers();
        const caller = new AbortController();
        vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
            init.signal!.addEventListener("abort", () => reject(init.signal!.reason), {once: true});
        })));

        const request = authFetch("http://localhost:3000/api/auth/get-session", {signal: caller.signal});
        const assertion = expect(request).rejects.toThrow("The authentication request timed out.");
        await vi.advanceTimersByTimeAsync(15_000);
        await assertion;
        expect(caller.signal.aborted).toBe(false);
    });

    it("still cancels a superseded session request immediately", async () => {
        const caller = new AbortController();
        vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
            init.signal!.addEventListener("abort", () => reject(init.signal!.reason), {once: true});
        })));

        const request = authFetch("http://localhost:3000/api/auth/get-session", {signal: caller.signal});
        const assertion = expect(request).rejects.toThrow("Superseded");
        caller.abort(new Error("Superseded"));
        await assertion;
    });
});
