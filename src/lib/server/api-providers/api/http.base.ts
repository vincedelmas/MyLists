import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {notFound} from "@tanstack/react-router";
import {RateLimiterQueue} from "rate-limiter-flexible";
import {FormattedError} from "@/lib/utils/error-classes";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {getRollupKey, PENDING_ROLLUPS_KEY, TWO_DAYS_CACHE_TTL_S} from "@/lib/server/core/cache-keys";


type ApiRequestMethod = "get" | "post";

type RecordCallParams = {
    url: string;
    status?: number;
    success: boolean;
    startedAt: number;
    errorName?: string;
    method: ApiRequestMethod;
}

export type ApiHttpClient = {
    call(url: string, method?: ApiRequestMethod, options?: RequestInit): Promise<Response>;
};

export type ApiClientConfig = {
    consumeKey: string;
    resultsPerPage?: number;
    throttleOptions: Parameters<typeof createRateLimiter>[0][];
};


const MAX_CALL_ATTEMPTS = 3;


export const createApiHttpClient = async (config: ApiClientConfig): Promise<ApiHttpClient> => {
    const limiters = await Promise.all(config.throttleOptions.map(opts => createRateLimiter(opts)));
    const queues = limiters.map(limiter => new RateLimiterQueue(limiter, { maxQueueSize: 200 }));

    return {
        async call(url: string, method: ApiRequestMethod = "get", options: RequestInit = {}) {
            try {
                for (let attempt = 1; attempt <= MAX_CALL_ATTEMPTS; attempt += 1) {
                    await Promise.all(queues.map(queue => queue.removeTokens(1, config.consumeKey)));

                    let response: Response;
                    const startedAt = Date.now();

                    try {
                        response = await fetch(url, {
                            method: method.toUpperCase(),
                            signal: AbortSignal.timeout(100_000),
                            ...options,
                        });
                    }
                    catch (err) {
                        const errorName = err instanceof Error ? err.name : "UnknownError";
                        void recordCall(config.consumeKey, { url, method, startedAt, success: false, errorName })
                            .catch((err) => {
                                logger.warn({ err, consumeKey: config.consumeKey, method, errorName }, "Failed to record provider API call");
                            });

                        throw err;
                    }

                    void recordCall(config.consumeKey, { url, method, startedAt, success: response.ok, status: response.status })
                        .catch((err) => {
                            logger.warn({ err, consumeKey: config.consumeKey, method, status: response.status },
                                "Failed to record provider API call");
                        });

                    if (response.ok) {
                        return response;
                    }

                    if (shouldRetry(response.status) && attempt < MAX_CALL_ATTEMPTS) {
                        await waitBeforeRetry(response, attempt);
                        continue;
                    }

                    await handleResponseError(response);
                }

                throw new FormattedError("API currently unavailable. Please try again later.");
            }
            catch (err) {
                if (err instanceof DOMException && err.name === "TimeoutError") {
                    throw new FormattedError("Request timed out. API probably down. Please try again later.");
                }
                throw err;
            }
        },
    };
};


function shouldRetry(status: number) {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}


function getRetryAfterSeconds(res: Response) {
    const retryAfter = res.headers.get("Retry-After");
    if (!retryAfter) return null;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
        return seconds;
    }

    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) {
        return Math.max(Math.ceil((dateMs - Date.now()) / 1000), 1);
    }

    return null;
}


async function waitBeforeRetry(res: Response, attempt: number) {
    const fallbackDelayMs = 500 * attempt;
    const retryAfterSecs = getRetryAfterSeconds(res);
    const delayMs = retryAfterSecs ? retryAfterSecs * 1000 : fallbackDelayMs;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}


async function handleResponseError(res: Response) {
    switch (res.status) {
        case 404:
            throw notFound();
        case 429:
            throw new FormattedError("Too many requests. Please try again in a minute.");
        case 403:
            throw new FormattedError("API quota or access limit reached. Please try again later.");
        case 410:
            throw new FormattedError("Media no longer available on the API.");
        case 401:
            throw new FormattedError("API not accessible. Please try again later.");
        case 500:
        case 502:
        case 503:
        case 504:
            throw new FormattedError("API currently not accessible. Please try again later.");
        default: {
            throw new Error(`Unexpected Error: ${res.status}`);
        }
    }
}


async function recordCall(consumeKey: string, params: RecordCallParams) {
    if (!serverEnv.REDIS_ENABLED) return;

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
