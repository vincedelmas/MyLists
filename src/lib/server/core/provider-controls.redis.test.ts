import {randomUUID} from "node:crypto";
import {afterAll, describe, expect, it, vi} from "vitest";
import {providerRequestContext} from "./provider-request-context";
import {getRedisConnection} from "./redis-client";
import {createRateLimiter} from "./rate-limiter";
import {acquireProviderSlot} from "./provider-concurrency";
import {consumeGoogleBooksQuota, getGoogleBooksQuotaWindow} from "../api-providers/api/gbooks-quota";
import {checkProviderCooldown, setProviderCooldown} from "../api-providers/api/provider-cooldown";
import {ProviderRequestError} from "../api-providers/api/provider-error";


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

    it("shares the daily budget atomically across processes while preserving interactive headroom", async () => {
        const redis = await getRedisConnection();
        const key = `gBooksAPI:daily:${getGoogleBooksQuotaWindow().day}`;
        expect(await redis.exists(key), "Use an isolated Redis instance for this test").toBe(0);
        const worker = startWorker(`
            const { consumeGoogleBooksQuota } = await import("./src/lib/server/api-providers/api/gbooks-quota.ts");
            const { providerRequestContext } = await import("./src/lib/server/core/provider-request-context.ts");
            const results = await providerRequestContext.run({ isImport: true }, () =>
                Promise.allSettled(Array.from({ length: 600 }, () => consumeGoogleBooksQuota())));
            console.log(results.filter(result => result.status === "fulfilled").length);
        `);
        try {
            const results = await providerRequestContext.run({ isImport: true }, () =>
                Promise.allSettled(Array.from({ length: 600 }, () => consumeGoogleBooksQuota())));
            const workerCount = Number(await new Response(worker.stdout).text());
            expect(await worker.exited, await new Response(worker.stderr).text()).toBe(0);
            expect(workerCount + results.filter(result => result.status === "fulfilled").length).toBe(900);
            await Promise.all(Array.from({ length: 100 }, () => consumeGoogleBooksQuota()));
            await expect(consumeGoogleBooksQuota()).rejects.toMatchObject({ details: { reason: "dailyLimitExceeded" } });
            expect(await redis.get(key)).toBe("1000");
            expect(await redis.pttl(key)).toBeGreaterThan(0);
        }
        finally {
            worker.kill();
            await redis.del(key);
        }
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

    it("enforces eight slots across processes and releases capacity when a response finishes", async () => {
        const provider = `redis-slots-${randomUUID()}`;
        const signal = AbortSignal.timeout(10_000);
        const releases = await Promise.all(Array.from({ length: 8 }, () => acquireProviderSlot(provider, 8, signal, 10_000)));
        const worker = startWorker(`
            const { acquireProviderSlot } = await import("./src/lib/server/core/provider-concurrency.ts");
            console.log("waiting");
            const release = await acquireProviderSlot(${JSON.stringify(provider)}, 8, AbortSignal.timeout(10000), 10000);
            console.log("acquired");
            await new Promise(resolve => process.stdin.once("data", resolve));
            await release();
        `);
        const reader = worker.stdout.getReader();
        try {
            expect(new TextDecoder().decode((await reader.read()).value)).toContain("waiting");
            let acquired = false;
            const acquisition = reader.read().then(result => { acquired = true; return result; });
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(acquired).toBe(false);
            await releases.pop()!();
            expect(new TextDecoder().decode((await acquisition).value)).toContain("acquired");
            expect(await (await getRedisConnection()).zcard(`provider:concurrency:${provider}`)).toBe(8);
            worker.stdin.write("release\n");
            worker.stdin.end();
            expect(await worker.exited, await new Response(worker.stderr).text()).toBe(0);
        }
        finally {
            worker.kill();
            reader.releaseLock();
            await Promise.all(releases.map(release => release()));
            await (await getRedisConnection()).del(`provider:concurrency:${provider}`);
        }
    });

    it("recovers a slot after its owning process is killed", async () => {
        const provider = `redis-killed-slot-${randomUUID()}`;
        const worker = startWorker(`
            const { acquireProviderSlot } = await import("./src/lib/server/core/provider-concurrency.ts");
            await acquireProviderSlot(${JSON.stringify(provider)}, 1, AbortSignal.timeout(5000), 100);
            console.log("acquired");
            await new Promise(resolve => process.stdin.once("data", resolve));
        `);
        const reader = worker.stdout.getReader();
        try {
            expect(new TextDecoder().decode((await reader.read()).value)).toContain("acquired");
            worker.kill("SIGKILL");
            await worker.exited;
            const release = await acquireProviderSlot(provider, 1, AbortSignal.timeout(5_000), 5_000);
            await release();
            expect(await (await getRedisConnection()).zcard(`provider:concurrency:${provider}`)).toBe(0);
        }
        finally {
            worker.kill();
            reader.releaseLock();
            await (await getRedisConnection()).del(`provider:concurrency:${provider}`);
        }
    });
});
