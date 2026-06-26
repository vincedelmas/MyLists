import {StatsActiveTab} from "@/lib/schemas";


export const ONE_HOUR_CACHE_TTL_MS = 60 * 60 * 1000;

export const ONE_DAY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const TWO_DAYS_CACHE_TTL_S = 60 * 60 * 24 * 2;

export const TRENDS_CACHE_KEY = "$trends:v2:null";

export const PENDING_ROLLUPS_KEY = "api-monitor:rollups:pending";


export const getPlatformStatsCacheKey = (data: StatsActiveTab) => {
    return `platformStats:v2:${JSON.stringify(data)}`;
};

export const getUserStatsCacheKey = (userId: number, data: StatsActiveTab) => {
    return `userStats:v2:${userId}:${JSON.stringify(data)}`;
};

export const getRollupKey = (bucketStartMs: number, provider: string, opts: { statuses?: boolean, seconds?: boolean } = {}) => {
    const base = `api-monitor:minute:${bucketStartMs}:provider:${provider}`;
    if (opts.seconds) return base + ":seconds";
    if (opts.statuses) return base + ":statuses";
    return base;
};
