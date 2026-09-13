import {randomUUID} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";
import {serverEnv} from "@/env/server";
import {getRedisConnection} from "./redis-client";


const memorySlots = new Map<string, Map<string, number>>();
const ACQUIRE_SLOT = `
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
    if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
    redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
    redis.call('PEXPIREAT', KEYS[1], ARGV[3])
    return 1
`;


export async function acquireProviderSlot(provider: string, limit: number, signal: AbortSignal, requestTimeoutMs: number) {
    const token = randomUUID();
    const key = `provider:concurrency:${provider}`;
    const redis = serverEnv.REDIS_ENABLED ? await getRedisConnection() : undefined;
    let slots = memorySlots.get(provider);
    if (!redis && !slots) {
        slots = new Map();
        memorySlots.set(provider, slots);
    }

    while (true) {
        signal.throwIfAborted();
        const now = Date.now();
        // The HTTP timeout starts before acquisition; the lease outlives that deadline.
        const expiresAt = now + requestTimeoutMs + 1_000;
        let acquired: boolean;
        if (redis) {
            acquired = await redis.eval(ACQUIRE_SLOT, 1, key, now, limit, expiresAt, token) === 1;
        }
        else {
            for (const [id, expiry] of slots!) if (expiry <= now) slots!.delete(id);
            acquired = slots!.size < limit;
            if (acquired) slots!.set(token, expiresAt);
        }

        if (acquired) {
            return async () => {
                if (redis) await redis.zrem(key, token);
                else slots!.delete(token);
            };
        }
        await delay(100, undefined, { signal });
    }
}
