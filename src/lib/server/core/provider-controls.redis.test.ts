import {randomUUID} from "node:crypto";
import {afterAll, describe, expect, it, vi} from "vitest";
import {getRedisConnection} from "./redis-client";
import {createRateLimiter} from "./rate-limiter";
import {checkProviderCooldown, setProviderCooldown} from "../api-providers/api/provider-cooldown";
import {ProviderRequestError} from "../api-providers/api/provider-error";
import {createApiHttpClient} from "../api-providers/api/http.base";


vi.mock("@/env/server", () => ({ serverEnv: {
    REDIS_ENABLED: true, REDIS_URL: process.env.MYLISTS_TEST_REDIS_URL, LOG_LEVEL: "silent",
} }));


// Opt in with an isolated Redis instance. No provider HTTP requests are made.
describe.skipIf(!process.env.MYLISTS_TEST_REDIS_URL)("shared Redis provider controls", () => {
    afterAll(async () => { await (await getRedisConnection()).quit(); });

    const startWorker = (code: string) => Bun.spawn([process.execPath, "--no-env-file", "-e", `
        const { getRedisConnection } = await import("./src/lib/server/core/redis-client.ts");
        ${code}
        await (await getRedisConnection()).quit();
    `], {
        cwd: process.cwd(), stdin: "pipe", stdout: "pipe", stderr: "pipe",
        env: {
            PATH: process.env.PATH, SKIP_ENV_VALIDATION: "true", LOG_LEVEL: "silent",
            REDIS_ENABLED: "true", REDIS_URL: process.env.MYLISTS_TEST_REDIS_URL,
        },
    });

    it("shares the longest cooldown and rate allowance across independent clients", async () => {
        const provider = `redis-provider-${randomUUID()}`;
        const redis = await getRedisConnection();
        const retryAt = Date.now() + 60_000;
        const error = new ProviderRequestError("Pause", { provider, kind: "quota", statusCode: 429, retryAt });
        await setProviderCooldown(error);
        await setProviderCooldown(new ProviderRequestError("Short pause", { ...error.details, retryAt: Date.now() + 1_000 }));
        const worker = startWorker(`
            const { checkProviderCooldown } = await import("./src/lib/server/api-providers/api/provider-cooldown.ts");
            try { await checkProviderCooldown(${JSON.stringify(provider)}); }
            catch (error) { console.log(JSON.stringify(error.details)); }
        `);
        try {
            expect(JSON.parse(await new Response(worker.stdout).text())).toMatchObject({ retryAt });
            expect(await worker.exited, await new Response(worker.stderr).text()).toBe(0);
            const options = { points: 1, duration: 2, keyPrefix: provider };
            const [first, second] = await Promise.all([createRateLimiter(options), createRateLimiter(options)]);
            await first.consume("shared");
            await expect(second.consume("shared")).rejects.toMatchObject({ remainingPoints: 0 });
            await redis.del(`provider:cooldown:${provider}`);
            await expect(checkProviderCooldown(provider)).resolves.toBeUndefined();
        }
        finally {
            worker.kill();
            await redis.del(`provider:cooldown:${provider}`, `${provider}:shared`);
        }
    });

    it("pauses provider requests within a bounded wait when Redis stops responding", async () => {
        const redis = await getRedisConnection();
        const client = await createApiHttpClient({ consumeKey: "redis-unresponsive", throttleOptions: [] });
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));
        await redis.call("CLIENT", "PAUSE", 10_000, "ALL");
        const startedAt = Date.now();
        try {
            await expect(client.call("https://example.com/items")).rejects.toMatchObject({
                details: { kind: "unavailable", reason: "requestControlsUnavailable" },
            });
            expect(Date.now() - startedAt).toBeLessThan(9_000);
            expect(fetchMock).not.toHaveBeenCalled();
        }
        finally {
            await redis.call("CLIENT", "UNPAUSE");
            fetchMock.mockRestore();
        }
    }, 15_000);

    it("preserves provider results when Redis cooldown writes fail", async () => {
        const provider = `redis-cleanup-${randomUUID()}`;
        const redis = await getRedisConnection();
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("busy", { status: 429 }));
        const evalMock = vi.spyOn(redis, "eval").mockRejectedValueOnce(new Error("Redis unavailable"));
        try {
            const client = await createApiHttpClient({ consumeKey: provider, throttleOptions: [] });
            await expect(client.call("https://example.com/items")).rejects.toMatchObject({ details: { kind: "rate_limit" } });
        }
        finally {
            evalMock.mockRestore();
            fetchMock.mockRestore();
            await redis.del(`provider:cooldown:${provider}`);
        }
    });
});
