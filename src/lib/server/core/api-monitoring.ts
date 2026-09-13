import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {getRollupKey, PENDING_ROLLUPS_KEY, TWO_DAYS_CACHE_TTL_S} from "@/lib/server/core/cache-keys";


type RecordCallParams = {
    status?: number;
    success: boolean;
    startedAt: number;
    errorName?: string;
};


export const recordProviderCall = async (consumeKey: string, params: RecordCallParams) => {
    if (!serverEnv.REDIS_ENABLED) return;

    try {
        const redis = await getRedisConnection();

        const calledAtMs = Date.now();
        const second = Math.floor(calledAtMs / 1000);
        const durationMs = calledAtMs - params.startedAt;

        const secondInMinute = second % 60;
        const bucketStartMs = Math.floor(calledAtMs / 60_000) * 60_000;
        const statusKey = String(params.status ?? params.errorName ?? "network-error");

        await redis
            .pipeline()
            .zadd(PENDING_ROLLUPS_KEY, bucketStartMs, `${bucketStartMs}|${consumeKey}`)
            .hincrby(getRollupKey(bucketStartMs, consumeKey), "total", 1)
            .hincrby(getRollupKey(bucketStartMs, consumeKey), "errors", params.success ? 0 : 1)
            .hincrby(getRollupKey(bucketStartMs, consumeKey), "durationMsTotal", durationMs)
            .hincrby(getRollupKey(bucketStartMs, consumeKey, { statuses: true }), statusKey, 1)
            .hincrby(getRollupKey(bucketStartMs, consumeKey, { seconds: true }), String(secondInMinute), 1)
            .hincrby(`api-monitor:second:${second}`, consumeKey, 1)
            .hincrby(`api-monitor:second:${second}`, "total", 1)
            .expire(getRollupKey(bucketStartMs, consumeKey), TWO_DAYS_CACHE_TTL_S)
            .expire(getRollupKey(bucketStartMs, consumeKey, { seconds: true }), TWO_DAYS_CACHE_TTL_S)
            .expire(getRollupKey(bucketStartMs, consumeKey, { statuses: true }), TWO_DAYS_CACHE_TTL_S)
            .expire(`api-monitor:second:${second}`, 60 * 60)
            .exec();
    }
    catch (err) {
        logger.warn({ err, consumeKey, status: params.status }, "Failed to record provider API call");
    }
};
