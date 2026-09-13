import {serverEnv} from "@/env/server";
import {logger} from "@/lib/server/core/logger";
import {notFound} from "@tanstack/react-router";
import {RateLimiterQueue} from "rate-limiter-flexible";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {acquireProviderSlot} from "@/lib/server/core/provider-concurrency";
import {getRollupKey, PENDING_ROLLUPS_KEY, TWO_DAYS_CACHE_TTL_S} from "@/lib/server/core/cache-keys";
import {ProviderRequestError, readProviderError} from "@/lib/server/api-providers/api/provider-error";
import {checkProviderCooldown, setProviderCooldown} from "@/lib/server/api-providers/api/provider-cooldown";


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
    maxConcurrent?: number;
    resultsPerPage?: number;
    getQuotaResetAt?: () => number;
    beforeRequest?: () => Promise<void>;
    throttleOptions: Parameters<typeof createRateLimiter>[0][];
};


const MAX_CALL_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 100_000;


export const createApiHttpClient = async (config: ApiClientConfig): Promise<ApiHttpClient> => {
    const limiters = await Promise.all([...config.throttleOptions].sort((a, b) => b.duration - a.duration)
        .map(opts => createRateLimiter(opts)));

    const queues = limiters.map(limiter => new RateLimiterQueue(limiter, { maxQueueSize: 200 }));

    return {
        async call(url: string, method: ApiRequestMethod = "get", options: RequestInit = {}) {
            for (let attempt = 1; attempt <= MAX_CALL_ATTEMPTS; attempt += 1) {
                await checkProviderCooldown(config.consumeKey);
                const signal = AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), ...options.signal ? [options.signal] : []]);

                let response: Response;
                let startedAt: number | undefined;
                let release: (() => Promise<void>) | undefined;
                const deadline = Math.ceil((Date.now() + REQUEST_TIMEOUT_MS) / 1000);

                try {
                    if (config.maxConcurrent) {
                        release = await acquireProviderSlot(config.consumeKey, config.maxConcurrent, signal, REQUEST_TIMEOUT_MS);
                    }
                    // Acquire the pacing slot after concurrency and longer-window waits.
                    for (const queue of queues) {
                        await queue.removeTokens(1, config.consumeKey, deadline);
                    }

                    signal.throwIfAborted();
                    await checkProviderCooldown(config.consumeKey);
                    await config.beforeRequest?.();

                    startedAt = Date.now();
                    response = await fetch(url, { ...options, method: method.toUpperCase(), signal });

                    // IGDB bodies are bounded JSON batches. Drain network body before freeing slot,
                    // leaving original response readable for provider's JSON parser.
                    if (config.maxConcurrent) {
                        await response.clone().arrayBuffer();
                    }
                }
                catch (err) {
                    if (options.signal?.aborted) throw options.signal.reason;
                    if (startedAt === undefined && !signal.aborted) throw err;

                    const errorName = err instanceof Error ? err.name : "UnknownError";
                    const { origin, pathname } = new URL(url);

                    if (startedAt !== undefined) {
                        logger.error({
                            err, consumeKey: config.consumeKey,
                            data: { url: `${origin}${pathname}`, method, startedAt, success: false, errorName },
                        }, "Failed to fetch API");

                        void recordCall(config.consumeKey, { url, method, startedAt, success: false, errorName })
                            .catch(err => logger.warn({ err, consumeKey: config.consumeKey }, "Failed to record provider API call"));
                    }

                    if (attempt < MAX_CALL_ATTEMPTS) {
                        await release?.();
                        release = undefined;
                        await waitBeforeRetry(attempt);
                        continue;
                    }

                    const error = new ProviderRequestError("Provider connection failed. Requests will resume later.", {
                        reason: errorName,
                        kind: "unavailable",
                        provider: config.consumeKey,
                        retryAt: Date.now() + 300_000,
                        statusCode: errorName === "TimeoutError" ? 504 : 503,
                    });

                    await setProviderCooldown(error);

                    throw error;
                }
                finally {
                    await release?.();
                }

                void recordCall(config.consumeKey, { url, method, startedAt, success: response.ok, status: response.status })
                    .catch(err => logger.warn({ err, consumeKey: config.consumeKey, status: response.status },
                        "Failed to record provider API call"));

                if (response.ok) return response;
                if (response.status === 404) {
                    await response.body?.cancel();
                    throw notFound();
                }

                const retryAfterSeconds = getRetryAfterSeconds(response);
                const retryAfterMs = retryAfterSeconds === null ? undefined : retryAfterSeconds * 1000;
                const error = await readProviderError(config.consumeKey, response, retryAfterMs, config.getQuotaResetAt?.());

                logger.warn({ ...error.details }, "Provider API request rejected");

                // Long server-directed waits are persisted, freeing the import worker for other providers.
                if (error.details.kind === "unavailable" && attempt < MAX_CALL_ATTEMPTS && (retryAfterMs ?? 0) <= 10_000) {
                    await waitBeforeRetry(attempt, retryAfterMs);
                    continue;
                }

                await setProviderCooldown(error);

                throw error;
            }

            throw new Error("Provider retry attempts exhausted");
        },
    };
};


function getRetryAfterSeconds(res: Response) {
    const retryAfter = res.headers.get("Retry-After");
    if (!retryAfter) return null;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
        return seconds >= 0 ? seconds : null;
    }

    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) {
        return Math.max(Math.ceil((dateMs - Date.now()) / 1000), 1);
    }

    return null;
}


async function waitBeforeRetry(attempt: number, retryAfterMs = 0) {
    const backoffMs = 1_000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
    await new Promise(resolve => setTimeout(resolve, Math.max(backoffMs, retryAfterMs)));
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
