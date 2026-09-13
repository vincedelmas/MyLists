import * as z from "zod";
import {FormattedError} from "@/lib/utils/error-classes";


export type ProviderErrorDetails = {
    reason?: string;
    provider: string;
    retryAt?: number;
    statusCode: number;
    quotaLimit?: string;
    kind: "quota" | "rate_limit" | "unavailable" | "access" | "item";
};


export class ProviderRequestError extends FormattedError {
    constructor(message: string, public readonly details: ProviderErrorDetails) {
        super(message, { statusCode: details.statusCode });
        this.name = "ProviderRequestError";
    }
}


const errorBodySchema = z.object({
    error: z.union([
        z.string(),
        z.object({
            status: z.string().optional(),
            errors: z.array(z.object({ reason: z.string().optional() })).optional(),
            details: z.array(z.object({
                reason: z.string().optional(),
                metadata: z.object({ quota_limit: z.string().optional() }).optional(),
            })).optional(),
        })
    ]).optional(),
});


export const readProviderError = async (provider: string, response: Response, retryAfterMs?: number, quotaResetAt?: number) => {
    const parsed = errorBodySchema.safeParse(await response.json().catch(() => null));

    const error = (parsed.success && typeof parsed.data.error === "object")
        ? parsed.data.error
        : undefined;

    const now = Date.now();
    const statusCode = response.status;

    const quotaLimit = error?.details?.find(detail => detail.metadata?.quota_limit)?.metadata?.quota_limit;
    const reason = error?.errors?.[0]?.reason ?? error?.details?.find(detail => detail.reason)?.reason ?? error?.status;

    let message: string;
    let retryAt: number | undefined;
    let kind: ProviderErrorDetails["kind"];

    if (/dailyLimitExceeded/i.test(reason ?? "") || /perday/i.test(quotaLimit ?? "")) {
        kind = "quota";
        retryAt = Math.max(quotaResetAt ?? now + 86_400_000, now + (retryAfterMs ?? 0));
        message = "Provider daily quota reached. Requests will resume after the quota resets.";
    }
    else if (statusCode === 429 || /rate.?limit|quotaExceeded|RESOURCE_EXHAUSTED/i.test(reason ?? "")) {
        kind = "rate_limit";
        retryAt = now + Math.max(retryAfterMs ?? 60_000, 1_000);
        message = "Provider rate limit reached. Requests are temporarily paused.";
    }
    else if (statusCode === 401 || statusCode === 403 || /API_KEY_INVALID|keyInvalid|accessNotConfigured/i.test(reason ?? "")) {
        kind = "access";
        retryAt = now + Math.max(retryAfterMs ?? 0, 300_000);
        message = "Provider access denied. Check the API credentials and restrictions before trying again.";
    }
    else if (statusCode >= 500 && statusCode < 600) {
        kind = "unavailable";
        retryAt = now + Math.max(retryAfterMs ?? 0, 300_000);
        message = "Provider temporarily unavailable. Requests will resume later.";
    }
    else {
        kind = "item";
        message = statusCode === 410
            ? "Media no longer available on the API."
            : `Unexpected Error: ${statusCode}`;
    }

    return new ProviderRequestError(message, { provider, statusCode, kind, retryAt, reason, quotaLimit });
};
