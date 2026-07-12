import {Redis} from "ioredis";
import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";


let redisInstance: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;


export const connectRedis = () => {
    if (redisInstance?.status === "ready" || redisInstance?.status === "connecting" || redisInstance?.status === "connect") {
        return connectionPromise || Promise.resolve(redisInstance);
    }

    if (!connectionPromise) {
        logger.info("Attempting to connect to Redis using ioredis");

        redisInstance = new Redis(serverEnv.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null });

        connectionPromise = new Promise((resolve, reject) => {
            redisInstance!.on("connect", () => logger.info("ioredis connecting"));
            redisInstance!.on("ready", () => {
                logger.info("ioredis client ready");
                resolve(redisInstance!);
            });
            redisInstance!.on("error", (error) => {
                logger.error({ err: error }, "ioredis client error");
                if (redisInstance?.status !== "ready" && redisInstance?.status !== "connecting") {
                    redisInstance = null;
                    connectionPromise = null;
                    reject(error);
                }
            });
            redisInstance!.on("end", () => logger.info("ioredis client connection closed"));
            redisInstance!.on("reconnecting", () => logger.warn("ioredis client reconnecting"));
            redisInstance!.connect().catch(reject);
        });
    }

    return connectionPromise;
};


export const getRedisConnection = async () => {
    const { connectRedis } = await import("@/lib/server/core/redis-client");
    const redisConnection = await connectRedis();
    if (!redisConnection) {
        throw new Error("Failed to connect to Redis.");
    }

    return redisConnection;
};
