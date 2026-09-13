import {serverEnv} from "@/env/server";
import {randomUUID} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";
import {getRedisConnection} from "@/lib/server/core/redis-client";


const memorySlots = new Map<string, Map<string, number>>();


const ACQUIRE_SLOT = `
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
    if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
    redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
    redis.call('PEXPIREAT', KEYS[1], ARGV[3])
    return 1
`;


export const acquireProviderSlot = async (provider: string, limit: number, signal: AbortSignal, requestTimeoutMs: number) => {
    const token = randomUUID();
    let slots = memorySlots.get(provider);
    const key = `provider:concurrency:${provider}`;
    const redis = serverEnv.REDIS_ENABLED ? await getRedisConnection() : undefined;

    if (!redis && !slots) {
        slots = new Map();
        memorySlots.set(provider, slots);
    }

    while (true) {
        signal.throwIfAborted();

        let acquired: boolean;
        const now = Date.now();
        const expiresAt = now + requestTimeoutMs + 1_000; // The HTTP timeout starts before acquisition; lease outlives deadline

        if (redis) {
            acquired = await redis.eval(ACQUIRE_SLOT, 1, key, now, limit, expiresAt, token) === 1;
        }
        else {
            for (const [id, expiry] of slots!) {
                if (expiry <= now) slots!.delete(id);
            }

            acquired = slots!.size < limit;
            if (acquired) {
                slots!.set(token, expiresAt);
            }
        }

        if (acquired) {
            return async () => {
                if (redis) await redis.zrem(key, token);
                else slots!.delete(token);
            };
        }
        await delay(100, undefined, { signal });
    }
};
