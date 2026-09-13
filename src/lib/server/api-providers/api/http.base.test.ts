import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const transportMocks = vi.hoisted(() => ({
    createRateLimiter: vi.fn(),
    removeTokens: vi.fn(),
    checkProviderCooldown: vi.fn(),
    setProviderCooldown: vi.fn(),
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}));


vi.mock("@/env/server", () => ({
    serverEnv: {
        REDIS_ENABLED: false,
    },
}));
vi.mock("@/lib/server/core/logger", () => ({
    logger: transportMocks.logger,
}));
vi.mock("./provider-cooldown", () => ({
    checkProviderCooldown: transportMocks.checkProviderCooldown,
    setProviderCooldown: transportMocks.setProviderCooldown,
}));
vi.mock("@/lib/server/core/rate-limiter", () => ({
    createRateLimiter: transportMocks.createRateLimiter,
}));
vi.mock("rate-limiter-flexible", () => ({
    RateLimiterQueue: class {
        removeTokens(points: number, key: string) {
            return transportMocks.removeTokens(points, key);
        }
    },
}));


import {FormattedError} from "@/lib/utils/error-classes";
import {ProviderRequestError} from "@/lib/server/api-providers/api/provider-error";
import {ApiClientConfig, createApiHttpClient} from "@/lib/server/api-providers/api/http.base";


const config: ApiClientConfig = {
    consumeKey: "test-api",
    throttleOptions: [
        { points: 5, duration: 1, keyPrefix: "test-api-second" },
        { points: 100, duration: 60, keyPrefix: "test-api-minute" },
    ],
};


describe("createApiHttpClient", () => {
    beforeEach(() => {
        transportMocks.createRateLimiter.mockReset();
        transportMocks.createRateLimiter.mockResolvedValue({});
        transportMocks.removeTokens.mockReset();
        transportMocks.removeTokens.mockResolvedValue(undefined);
        transportMocks.logger.error.mockReset();
        transportMocks.logger.warn.mockReset();
        transportMocks.checkProviderCooldown.mockReset().mockResolvedValue(undefined);
        transportMocks.setProviderCooldown.mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("applies every configured limiter and forwards successful requests", async () => {
        const response = new Response("ok", { status: 200 });
        const fetchMock = vi.fn().mockResolvedValue(response);
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        const result = await client.call("https://example.com/items", "post", {
            body: "payload",
            headers: { "Content-Type": "text/plain" },
        });

        expect(result).toBe(response);
        expect(transportMocks.createRateLimiter).toHaveBeenCalledTimes(2);
        expect(transportMocks.removeTokens).toHaveBeenCalledTimes(2);
        expect(transportMocks.removeTokens).toHaveBeenNthCalledWith(1, 1, "test-api");
        expect(fetchMock).toHaveBeenCalledWith("https://example.com/items", expect.objectContaining({
            method: "POST",
            body: "payload",
            headers: { "Content-Type": "text/plain" },
            signal: expect.any(AbortSignal),
        }));
    });

    it("retries retryable HTTP responses and consumes limiter tokens for each attempt", async () => {
        vi.useFakeTimers();
        const successResponse = new Response("ok", { status: 200 });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
            .mockResolvedValueOnce(successResponse);
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient({ ...config, throttleOptions: [config.throttleOptions[0]] });

        const pendingResponse = client.call("https://example.com/items");
        await vi.runAllTimersAsync();

        await expect(pendingResponse).resolves.toBe(successResponse);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(transportMocks.removeTokens).toHaveBeenCalledTimes(2);
    });

    it("checks quota for every attempt and does not send a retry after the budget is exhausted", async () => {
        vi.useFakeTimers();
        const quotaError = new ProviderRequestError("Daily quota exhausted", {
            provider: "test-api", kind: "quota", statusCode: 429, retryAt: Date.now() + 86_400_000,
        });
        const beforeRequest = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(quotaError);
        const fetchMock = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient({ ...config, beforeRequest });
        const assertion = expect(client.call("https://example.com/items")).rejects.toBe(quotaError);
        await vi.runAllTimersAsync();
        await assertion;
        expect(beforeRequest).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("does not retry non-retryable HTTP responses", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        await expect(client.call("https://example.com/items")).rejects.toThrow("Unexpected Error: 400");
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("bounds network retries, starts a cooldown, and logs only the URL origin and pathname", async () => {
        vi.useFakeTimers();
        const url = "https://example.com/items?api_key=test-secret&query=private-search#private-fragment";
        const networkError = Object.assign(new TypeError(`Connection reset for ${url}`), {
            code: "ECONNRESET",
            path: url,
        });
        const fetchMock = vi.fn().mockRejectedValue(networkError);
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        const assertion = expect(client.call(url)).rejects.toMatchObject({ details: { kind: "unavailable", reason: "TypeError" } });
        await vi.runAllTimersAsync();
        await assertion;
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(transportMocks.setProviderCooldown).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(url, expect.any(Object));
        expect(transportMocks.logger.error).toHaveBeenCalledTimes(3);
        expect(transportMocks.logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                errorCode: "ECONNRESET",
                data: expect.objectContaining({ url: "https://example.com/items" }),
            }),
            "Failed to fetch API",
        );
        expect(JSON.stringify(transportMocks.logger.error.mock.calls)).not.toContain("test-secret");
        expect(JSON.stringify(transportMocks.logger.error.mock.calls)).not.toContain("private-search");
    });

    it("maps fetch timeouts to a formatted gateway-timeout error", async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        const request = client.call("https://example.com/items");
        const assertion = expect(request).rejects.toMatchObject({
            args: { statusCode: 504 },
        });
        await vi.runAllTimersAsync();
        await assertion;
        await expect(request).rejects.toBeInstanceOf(FormattedError);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it.each([true, false])("handles interrupted response bodies inside transport retries (recovers: %s)", async recovers => {
        vi.useFakeTimers();
        const url = "https://example.com/books?key=test-secret";
        let attempts = 0;
        const fetchMock = vi.fn().mockImplementation(async () => {
            if (++attempts > 1 && recovers) return Response.json({ items: [] });
            return new Response(new ReadableStream({
                start(controller) {
                    controller.error(Object.assign(new TypeError("Connection reset"), { code: "ECONNRESET", path: url }));
                },
            }));
        });
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);
        const pending = client.call(url);
        const assertion = recovers
            ? expect(pending.then(response => response.json())).resolves.toEqual({ items: [] })
            : expect(pending).rejects.toMatchObject({ details: { kind: "unavailable" } });
        await vi.runAllTimersAsync();
        await assertion;
        expect(fetchMock).toHaveBeenCalledTimes(recovers ? 2 : 3);
        expect(transportMocks.setProviderCooldown).toHaveBeenCalledTimes(recovers ? 0 : 1);
        expect(JSON.stringify(transportMocks.logger.error.mock.calls)).not.toContain("test-secret");
    });

    it("honors a 429 and Retry-After even when its response body is interrupted", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(new ReadableStream({
            start(controller) { controller.error(new TypeError("Connection reset")); },
        }), { status: 429, headers: { "Retry-After": "120" } }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient({ ...config, maxConcurrent: 1 });
        const now = Date.now();
        await expect(client.call("https://example.com/items")).rejects.toMatchObject({ details: { kind: "rate_limit" } });
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(transportMocks.setProviderCooldown.mock.calls[0][0].details.retryAt).toBeGreaterThanOrEqual(now + 120_000);
    });

    it("preserves Google daily quota reasons and metadata without retrying a 429", async () => {
        const resetAt = Date.now() + 86_400_000;
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: {
            errors: [{ reason: "rateLimitExceeded" }],
            details: [{ reason: "RATE_LIMIT_EXCEEDED", metadata: { quota_limit: "defaultPerDayPerProject" } }],
        } }, { status: 429 }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient({ ...config, getQuotaResetAt: () => resetAt });
        await expect(client.call("https://example.com/books")).rejects.toMatchObject({ details: {
            kind: "quota", reason: "rateLimitExceeded", quotaLimit: "defaultPerDayPerProject", retryAt: resetAt,
        } });
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(transportMocks.setProviderCooldown).toHaveBeenCalledOnce();
    });

    it.each(["120", new Date(Date.now() + 120_000).toUTCString()])("persists Retry-After %s instead of holding the worker", async header => {
        const fetchMock = vi.fn().mockResolvedValue(new Response("busy", { status: 503, headers: { "Retry-After": header } }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);
        await expect(client.call("https://example.com/items")).rejects.toMatchObject({ details: { kind: "unavailable" } });
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(transportMocks.setProviderCooldown.mock.calls[0][0].details.retryAt).toBeGreaterThanOrEqual(Date.now() + 119_000);
    });

    it("classifies rate-limit 403 responses separately from credential errors", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { errors: [{ reason: "userRateLimitExceeded" }] } }, { status: 403 })));
        const client = await createApiHttpClient(config);
        await expect(client.call("https://example.com/items")).rejects.toMatchObject({ details: { kind: "rate_limit" } });
    });

    it.each([401, 403])("stops on credential status %s and shares the access failure", async status => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: { errors: [{ reason: "forbidden" }] } }, { status }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);
        await expect(client.call("https://example.com/items")).rejects.toMatchObject({ details: { kind: "access", reason: "forbidden" } });
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(transportMocks.setProviderCooldown).toHaveBeenCalledOnce();
    });

    it("backs off exponentially with bounded jitter before stopping persistent server errors", async () => {
        vi.useFakeTimers();
        const times: number[] = [];
        vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
            times.push(Date.now());
            return Promise.resolve(new Response("unavailable", { status: 503 }));
        }));
        const client = await createApiHttpClient(config);
        const assertion = expect(client.call("https://example.com/items")).rejects.toMatchObject({ details: { kind: "unavailable" } });
        await vi.runAllTimersAsync();
        await assertion;
        expect(times).toHaveLength(3);
        expect(times[1] - times[0]).toBeGreaterThanOrEqual(1_000);
        expect(times[1] - times[0]).toBeLessThan(1_500);
        expect(times[2] - times[1]).toBeGreaterThanOrEqual(2_000);
        expect(times[2] - times[1]).toBeLessThan(2_500);
    });

    it("rejects calls during an existing provider cooldown without spending rate or quota tokens", async () => {
        const error = new ProviderRequestError("Provider paused", {
            provider: "test-api", kind: "rate_limit", statusCode: 429, retryAt: Date.now() + 60_000,
        });
        transportMocks.checkProviderCooldown.mockRejectedValue(error);
        const beforeRequest = vi.fn();
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient({ ...config, beforeRequest });
        await expect(client.call("https://example.com/items")).rejects.toBe(error);
        expect(transportMocks.removeTokens).not.toHaveBeenCalled();
        expect(beforeRequest).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(["cooldown", "limiter"])("pauses when the %s control fails without contacting the provider", async control => {
        const unavailable = new Error("Redis command timed out");
        if (control === "cooldown") transportMocks.checkProviderCooldown.mockRejectedValue(unavailable);
        else transportMocks.removeTokens.mockRejectedValue(unavailable);
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);
        await expect(client.call("https://example.com/items")).rejects.toMatchObject({
            details: { kind: "unavailable", reason: "requestControlsUnavailable" },
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(transportMocks.setProviderCooldown).not.toHaveBeenCalled();
    });

    it("maps a 404 response to the router not-found result", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        await expect(client.call("https://example.com/items/404")).rejects.toMatchObject({
            isNotFound: true,
        });
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("holds shared concurrency slots until bodies arrive, then leaves responses readable", async () => {
        const bodies: ReadableStreamDefaultController[] = [];
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(new ReadableStream({
            start(controller) { bodies.push(controller); },
        }))));
        vi.stubGlobal("fetch", fetchMock);
        const options = { consumeKey: "body-concurrency", maxConcurrent: 8, throttleOptions: [] };
        const clients = await Promise.all([createApiHttpClient(options), createApiHttpClient(options)]);
        const requests = Array.from({ length: 9 }, (_, i) => clients[i % 2].call("https://example.com/games"));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
        bodies[0].enqueue(new TextEncoder().encode("[]"));
        bodies[0].close();
        await requests[0];
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(9));
        for (const body of bodies.slice(1)) {
            body.enqueue(new TextEncoder().encode("[]"));
            body.close();
        }
        const responses = await Promise.all(requests);
        expect(await Promise.all(responses.map(response => response.json()))).toEqual(Array.from({ length: 9 }, () => []));
    });

    it("releases concurrency when a pre-request quota check rejects", async () => {
        const beforeRequest = vi.fn().mockRejectedValueOnce(new ProviderRequestError("Quota reached", {
            provider: "quota-slot", kind: "quota", statusCode: 429, retryAt: Date.now() + 86_400_000,
        })).mockResolvedValue(undefined);
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json([])));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient({ consumeKey: "quota-slot", maxConcurrent: 1, throttleOptions: [], beforeRequest });
        await expect(client.call("https://example.com/games")).rejects.toThrow("Quota reached");
        await expect(client.call("https://example.com/games")).resolves.toBeInstanceOf(Response);
        expect(fetchMock).toHaveBeenCalledOnce();
    });
});
