import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const transportMocks = vi.hoisted(() => ({
    createRateLimiter: vi.fn(),
    removeTokens: vi.fn(),
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

    it("does not retry non-retryable HTTP responses", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        await expect(client.call("https://example.com/items")).rejects.toThrow("Unexpected Error: 400");
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("propagates a network exception without retrying it", async () => {
        const networkError = new TypeError("Connection reset");
        const fetchMock = vi.fn().mockRejectedValue(networkError);
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        await expect(client.call("https://example.com/items")).rejects.toBe(networkError);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(transportMocks.logger.error).toHaveBeenCalledOnce();
    });

    it("maps fetch timeouts to a formatted gateway-timeout error", async () => {
        const fetchMock = vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
        vi.stubGlobal("fetch", fetchMock);
        const client = await createApiHttpClient(config);

        const request = client.call("https://example.com/items");
        await expect(request).rejects.toBeInstanceOf(FormattedError);
        await expect(request).rejects.toMatchObject({
            args: { statusCode: 504 },
        });
        expect(fetchMock).toHaveBeenCalledOnce();
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
});
