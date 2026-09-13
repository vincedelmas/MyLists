import {serverEnv} from "@/env/server";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {providerRequestContext} from "@/lib/server/core/provider-request-context";
import {ProviderRequestError} from "@/lib/server/api-providers/api/provider-error";


const IMPORT_LIMIT = 900;
const DAILY_LIMIT = 1_000;
const pacificDate = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    year: "numeric",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
});


let memoryUsage = { day: "", count: 0 };


const CONSUME_QUOTA = `
    local used = tonumber(redis.call('GET', KEYS[1]) or '0')
    if used >= tonumber(ARGV[1]) then return 0 end
    redis.call('INCR', KEYS[1])
    redis.call('PEXPIREAT', KEYS[1], ARGV[2])
    return 1
`;


export const getGoogleBooksQuotaWindow = (now = Date.now()) => {
    const day = pacificDate.format(now);
    const nextDayUtc = Date.parse(`${day}T00:00:00Z`) + 86_400_000;

    // Pacific midnight is 07:00 or 08:00 UTC, including on daylight-saving transition days.
    const daylightMidnight = nextDayUtc + 7 * 3_600_000;
    const resetAt = pacificDate.format(daylightMidnight) === day ? daylightMidnight + 3_600_000 : daylightMidnight;

    return { day, resetAt };
};


export const consumeGoogleBooksQuota = async () => {
    const { day, resetAt } = getGoogleBooksQuotaWindow();

    let allowed: boolean;
    const isImport = providerRequestContext.getStore()?.isImport === true;
    const limit = isImport ? IMPORT_LIMIT : DAILY_LIMIT;

    if (serverEnv.REDIS_ENABLED) {
        const redis = await getRedisConnection();
        allowed = await redis.eval(CONSUME_QUOTA, 1, `gBooksAPI:daily:${day}`, limit, resetAt) === 1;
    }
    else {
        if (memoryUsage.day !== day) {
            memoryUsage = { day, count: 0 };
        }
        
        allowed = memoryUsage.count < limit;

        if (allowed) {
            memoryUsage.count += 1;
        }
    }

    if (!allowed) {
        throw new ProviderRequestError(isImport
            ? "Google Books daily import budget reached. Import will resume after the quota resets."
            : "Google Books daily quota reached. Please try again after the quota resets.", {
            provider: "gBooks-API", statusCode: 429, kind: "quota", retryAt: resetAt,
            reason: isImport ? "importBudgetExceeded" : "dailyLimitExceeded",
        });
    }
};
