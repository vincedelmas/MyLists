type MediaRefreshRange = "30d" | "90d" | "1y" | "all";
export type ApiMonitoringRange = "24h" | "7d" | "30d" | "90d" | "all";


export type AdminMediaRefreshStatsParams = {
    recentPage?: number;
    topRange?: MediaRefreshRange;
    dailyRange?: MediaRefreshRange;
};

export type AdminApiMonitoringParams = {
    recentPage?: number;
    range?: ApiMonitoringRange;
    dailyRange?: Exclude<ApiMonitoringRange, "24h">;
};

export type ProviderApiRollup = {
    total: number;
    errors: number;
    provider: string;
    bucketStartMs: number;
    maxSecondBurst: number;
    durationMsTotal: number;
    statusCounts: Record<string, number>;
};
