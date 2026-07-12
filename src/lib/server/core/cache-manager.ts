import Redis from "ioredis";
import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {getRedisConnection} from "@/lib/server/core/redis-client";


export type CacheManager = Awaited<ReturnType<typeof setupCacheManager>>;


interface CacheStore {
    getStoreType(): string;

    del(key: string): Promise<void>;

    get<T>(key: string): Promise<T | undefined>;

    increment(key: string, amount?: number): Promise<number>;

    set(key: string, value: any, ttl?: number): Promise<void>;

    wrap<T>(key: string, fn: () => Promise<T>, options?: { ttl?: number }): Promise<T>;
}


class RedisCacheStore implements CacheStore {
    constructor(
        private redis: Redis,
        private defaultTtl: number,
    ) {
    }

    async get<T>(key: string): Promise<T | undefined> {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : undefined;
    }

    async set(key: string, value: any, ttl?: number) {
        const ttlMs = ttl ?? this.defaultTtl;
        await this.redis.set(key, JSON.stringify(value), "PX", ttlMs);
    }

    async del(key: string) {
        await this.redis.del(key);
    }

    async wrap<T>(key: string, fn: () => Promise<T>, options?: { ttl?: number }): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const result = await fn();
        await this.set(key, result, options?.ttl);

        return result;
    }

    async increment(key: string, amount = 1) {
        const newValue = await this.redis.incrby(key, amount);
        return newValue;
    }

    getStoreType(): string {
        return "Redis";
    }
}


class MemoryCacheStore implements CacheStore {
    private cache = new Map<string, { value: any; expires: number }>();

    constructor(private defaultTtl: number) {
    }

    async get<T>(key: string): Promise<T | undefined> {
        const cached = this.cache.get(key);

        if (cached && cached.expires > Date.now()) {
            return cached.value;
        }

        if (cached) {
            this.cache.delete(key);
        }

        return undefined;
    }

    async set(key: string, value: any, ttl?: number) {
        const ttlMs = ttl ?? this.defaultTtl;
        this.cache.set(key, { value, expires: Date.now() + ttlMs });
    }

    async del(key: string) {
        this.cache.delete(key);
    }

    async wrap<T>(key: string, fn: () => Promise<T>, options?: { ttl?: number }): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const result = await fn();
        await this.set(key, result, options?.ttl);

        return result;
    }

    async increment(key: string, amount = 1) {
        const cached = this.cache.get(key);
        const ttl = this.defaultTtl;

        let newValue: number;
        if (cached && cached.expires > Date.now() && typeof cached.value === "number") {
            newValue = cached.value + amount;
        }
        else {
            newValue = amount;
        }

        this.cache.set(key, { value: newValue, expires: Date.now() + ttl });

        return newValue;
    }

    getStoreType() {
        return "In-Memory";
    }
}


export const setupCacheManager = async () => {
    const cache_ttl_ms = serverEnv.CACHE_TTL_MIN * 60 * 1000;

    let cache: CacheStore;

    if (serverEnv.REDIS_ENABLED) {
        const redis = await getRedisConnection();
        cache = new RedisCacheStore(redis, cache_ttl_ms);
    }
    else {
        cache = new MemoryCacheStore(cache_ttl_ms);
    }

    logger.info({ storeType: cache.getStoreType(), ttlSeconds: cache_ttl_ms / 1000 }, "Cache manager initialized");

    return cache;
};
