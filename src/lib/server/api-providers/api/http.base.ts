import {logger} from "@/lib/server/core/logger";
import {notFound} from "@tanstack/react-router";
import {RateLimiterQueue} from "rate-limiter-flexible";
import {createRateLimiter} from "@/lib/server/core/rate-limiter";
import {recordProviderCall} from "@/lib/server/core/api-monitoring";
import {ProviderRequestError, readProviderError} from "@/lib/server/api-providers/api/provider-error";
import {checkProviderCooldown, setProviderCooldown} from "@/lib/server/api-providers/api/provider-cooldown";


type ApiRequestMethod = "get" | "post";

export type ApiHttpClient = {
    call(url: string, method?: ApiRequestMethod, options?: RequestInit): Promise<Response>;
};

export type ApiClientConfig = {
    consumeKey: string;
    resultsPerPage?: number;
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
                const signal = AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), ...options.signal ? [options.signal] : []]);

                let response: Response;
                let startedAt: number | undefined;
                const deadline = Math.ceil((Date.now() + REQUEST_TIMEOUT_MS) / 1000);

                try {
                    await checkProviderCooldown(config.consumeKey);

                    for (const queue of queues) {
                        await queue.removeTokens(1, config.consumeKey, deadline);
                    }

                    signal.throwIfAborted();
                    await checkProviderCooldown(config.consumeKey);

                    startedAt = Date.now();
                    response = await fetch(url, { ...options, method: method.toUpperCase(), signal });

                    // Finish download inside retry boundary
                    // Keep original response readable for provider's JSON/text parser
                    try {
                        await response.clone().arrayBuffer();
                    }
                    catch (error) {
                        if (response.ok) throw error;
                    }
                }
                catch (err) {
                    if (options.signal?.aborted) throw options.signal.reason;
                    if (err instanceof ProviderRequestError) throw err;

                    const errorName = err instanceof Error ? err.name : "UnknownError";
                    if (startedAt === undefined) {
                        logger.warn({ consumeKey: config.consumeKey, errorName }, "Provider request controls unavailable");

                        throw new ProviderRequestError("Provider request controls are busy or unavailable. Requests will resume later.", {
                            provider: config.consumeKey, kind: "unavailable", statusCode: 503,
                            reason: "requestControlsUnavailable", retryAt: Date.now() + 300_000,
                        });
                    }
                    const { origin, pathname } = new URL(url);

                    logger.error({
                        consumeKey: config.consumeKey,
                        errorCode: err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined,
                        data: { url: `${origin}${pathname}`, method, startedAt, success: false, errorName },
                    }, "Failed to fetch API");

                    void recordProviderCall(config.consumeKey, { startedAt, success: false, errorName });

                    if (attempt < MAX_CALL_ATTEMPTS) {
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

                void recordProviderCall(config.consumeKey, { startedAt, success: response.ok, status: response.status });

                if (response.ok) return response;
                if (response.status === 404) {
                    await response.body?.cancel();
                    throw notFound();
                }

                const retryAfterSeconds = getRetryAfterSeconds(response);
                const retryAfterMs = retryAfterSeconds === null ? undefined : retryAfterSeconds * 1000;
                const error = await readProviderError(config.consumeKey, response, retryAfterMs);

                logger.warn({ ...error.details }, "Provider API request rejected");

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
