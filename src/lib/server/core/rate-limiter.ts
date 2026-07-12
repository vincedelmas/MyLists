import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {IRateLimiterRedisOptions, RateLimiterMemory, RateLimiterRedis} from "rate-limiter-flexible";


// Type requires core fields but allows other Redis options
type RateLimiterOptions = Pick<IRateLimiterRedisOptions, "points" | "duration" | "keyPrefix">
    & Partial<Omit<IRateLimiterRedisOptions, "points" | "duration" | "keyPrefix">>;


export const createRateLimiter = async (options: RateLimiterOptions) => {
    if (serverEnv.REDIS_ENABLED) {
        try {
            const connection = await getRedisConnection();
            logger.info({ options }, "Creating Redis rate limiter");
            return new RateLimiterRedis({ ...options, storeClient: connection });
        }
        catch (err) {
            throw new Error(`Failed to create rate limiter: ${err}`, { cause: err });
        }
    }
    else {
        logger.info({ options }, "Creating in-memory rate limiter");
        return new RateLimiterMemory(options);
    }
};
