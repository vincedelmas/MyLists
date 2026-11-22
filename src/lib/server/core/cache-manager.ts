import Redis from "ioredis";
import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {getRedisConnection} from "@/lib/server/core/redis-client";


export type CacheManager = Awaited<ReturnType<typeof setupCacheManager>>;

const MEMORY_CACHE_MAX_ENTRIES = 1_000;


abstract class CacheStore {
    private pending = new Map<string, Promise<unknown>>();

    abstract getStoreType(): string;

    abstract del(key: string): Promise<void>;

    abstract get<T>(key: string): Promise<T | undefined>;

    protected abstract setSerialized(key: string, value: string, ttl?: number): Promise<void>;

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) {
            await this.del(key);
            return;
        }

        await this.setSerialized(key, serialized, ttl);
    }

    async wrap<T>(key: string, fn: () => Promise<T>, options?: { ttl?: number }): Promise<T> {
        const existing = this.pending.get(key);
        if (existing) return existing as Promise<T>;

        const pending = (async () => {
            const cached = await this.get<T>(key);
            if (cached !== undefined) return cached;

            const result = await fn();
            await this.set(key, result, options?.ttl);
            return result;
        })();

        this.pending.set(key, pending);
        try {
            return await pending;
        }
        finally {
            this.pending.delete(key);
        }
    }
}


class RedisCacheStore extends CacheStore {
    constructor(private redis: Redis, private defaultTtl: number) {
        super();
    }

    async get<T>(key: string): Promise<T | undefined> {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : undefined;
    }

    protected async setSerialized(key: string, value: string, ttl?: number) {
        const ttlMs = ttl ?? this.defaultTtl;
        await this.redis.set(key, value, "PX", ttlMs);
    }

    async del(key: string) {
        await this.redis.del(key);
    }

    getStoreType(): string {
        return "Redis";
    }
}


class MemoryCacheStore extends CacheStore {
    private cache = new Map<string, { value: string; expires: number }>();

    constructor(private defaultTtl: number) {
        super();
        
        setInterval(() => {
            const now = Date.now();

            for (const [key, cached] of this.cache) {
                if (cached.expires <= now) {
                    this.cache.delete(key);
                }
            }
        }, 5 * 60 * 1000).unref();
    }

    async get<T>(key: string): Promise<T | undefined> {
        const cached = this.cache.get(key);

        if (cached && cached.expires > Date.now()) {
            this.cache.delete(key);
            this.cache.set(key, cached);
            return JSON.parse(cached.value);
        }

        if (cached) {
            this.cache.delete(key);
        }

        return undefined;
    }

    protected async setSerialized(key: string, value: string, ttl?: number) {
        const ttlMs = ttl ?? this.defaultTtl;
        this.cache.delete(key);

        if (this.cache.size >= MEMORY_CACHE_MAX_ENTRIES) {
            this.cache.delete(this.cache.keys().next().value!);
        }

        this.cache.set(key, { value, expires: Date.now() + ttlMs });
    }

    async del(key: string) {
        this.cache.delete(key);
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
