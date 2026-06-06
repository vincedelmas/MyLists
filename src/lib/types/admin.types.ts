export type MediaRefreshRange = "30d" | "90d" | "1y" | "all";
export type ApiMonitoringRange = "24h" | "7d" | "30d" | "90d" | "all";


export type AdminMediaRefreshStatsParams = {
    recentPage?: number;
    topRange?: MediaRefreshRange;
    dailyRange?: MediaRefreshRange;
};

export type AdminErrorLog = {
    name: string,
    message: string,
    stack: string | null,
}

export type AdminApiMonitoringParams = {
    recentPage?: number;
    range?: ApiMonitoringRange;
    dailyRange?: Exclude<ApiMonitoringRange, "24h">;
};

export type ProviderApiRollup = {
    provider: string;
    total: number;
    errors: number;
    bucketStartMs: number;
    durationMsTotal: number;
    maxSecondBurst: number;
    statusCounts: Record<string, number>;
};
