import {serverEnv} from "@/env/server";
import {SearchType} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {logger} from "@/lib/server/core/logger";
import {SaveTaskToDb} from "@/lib/types/tasks.types";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {AdminRepository} from "@/lib/server/domain/admin/admin.repository";
import {getRollupKey, PENDING_ROLLUPS_KEY} from "@/lib/server/core/cache-keys";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {AdminApiMonitoringParams, AdminMediaRefreshStatsParams} from "@/lib/types/admin.types";


export class AdminService {
    constructor(private repository: typeof AdminRepository) {
    }

    async saveTaskToDb(data: SaveTaskToDb) {
        return this.repository.saveTaskToDb(data);
    }

    async getArchivedTasksForAdmin() {
        return this.repository.getArchivedTasksForAdmin();
    }

    async deleteArchivedTaskForAdmin(taskId: string) {
        return this.repository.deleteArchivedTaskForAdmin(taskId);
    }

    async getMediaOverviewForAdmin(mediaServiceRegistry: typeof MediaServiceRegistry) {
        const mediaStats = await Promise.all(Object.values(MediaType).map(async (mediaType) => {
            const mediaService = mediaServiceRegistry.get(mediaType);
            const { added, updated } = await mediaService.getUserMediaAddedAndUpdatedForAdmin();
            return { mediaType, added, updated };
        }));

        const addedThisMonth = mediaStats.reduce((sum, { added }) => sum + added.thisMonth, 0);
        const addedLastMonth = mediaStats.reduce((sum, { added }) => sum + added.lastMonth, 0);
        const updatedThisMonth = mediaStats.reduce((sum, { updated }) => sum + updated.thisMonth, 0);

        return {
            addedThisMonth,
            addedLastMonth,
            updatedThisMonth,
            addedComparedToLastMonth: addedThisMonth - addedLastMonth,
            addedPerMediaType: mediaStats.map(({ mediaType, added }) => ({ mediaType, ...added })),
            updatedPerMediaType: mediaStats.map(({ mediaType, updated }) => ({ mediaType, ...updated })),
        };
    }

    async getCollectionsOverviewForAdmin() {
        const [overview, createdPerMonth] = await Promise.all([
            this.repository.getCollectionsOverview(),
            this.repository.getCollectionsCreatedPerMonth(),
        ]);

        return {
            createdPerMonth,
            totalViews: overview.totalViews,
            totalLikes: overview.totalLikes,
            totalCollections: overview.total,
            totalCopies: overview.totalCopies,
            uniqueOwners: overview.uniqueOwners,
            collectionsPerPrivacy: overview.collectionsPerPrivacy,
            collectionsPerMediaType: overview.collectionsPerMediaType,
            createdThisMonth: {
                count: overview.createdThisMonth,
                comparedToLastMonth: overview.createdThisMonth - overview.createdPreviousMonth,
            },
        };
    }

    async getPaginatedCollectionsForAdmin(data: SearchType) {
        return this.repository.getPaginatedCollectionsForAdmin(data);
    }

    async logMediaRefresh(params: { userId: number; mediaType: MediaType; apiId: number | string }) {
        return this.repository.logMediaRefresh(params);
    }

    async getMediaRefreshStats({ dailyRange = "30d", topRange = "all", recentPage = 1 }: AdminMediaRefreshStatsParams = {}) {
        const mediaRefreshRangeDays = { "30d": 30, "90d": 90, "1y": 365, all: null };

        const mediaTypes = Object.values(MediaType);
        const topDays = mediaRefreshRangeDays[topRange];
        const dailyDays = mediaRefreshRangeDays[dailyRange];
        const today = new Date(new Date().setUTCHours(0, 0, 0, 0));

        const [dailyByType, topUsers, totalsByRole, totalsByType, summary, recentRefreshes] = await Promise.all([
            this.repository.getMediaRefreshDailyCountsByType(dailyDays),
            this.repository.getMediaRefreshTopUsers(topDays),
            this.repository.getMediaRefreshTotalsByRole(),
            this.repository.getMediaRefreshTotalsByType(),
            this.repository.getMediaRefreshSummary(),
            this.repository.getRecentMediaRefreshes(recentPage),
        ]);

        const countsByKey = new Map(dailyByType.map((row) => [`${row.date}|${row.mediaType}`, Number(row.count)]));

        const dailyStartDate = (dailyRange === "all")
            ? (summary.firstRefreshDate ? new Date(`${summary.firstRefreshDate}T00:00:00.000Z`) : null)
            : new Date(today.getTime() - ((dailyDays ?? 1) - 1) * 24 * 60 * 60 * 1000);

        const daily = dailyStartDate ? this._buildDailySeriesByKey(dailyStartDate, today, mediaTypes, countsByKey) : [];

        const normalizedTotalsByType = mediaTypes
            .map((mediaType) => ({
                mediaType,
                count: Number(totalsByType.find((row) => row.mediaType === mediaType)?.count ?? 0),
            }))
            .filter((row) => row.count > 0).sort((a, b) => b.count - a.count);

        const activeDays = summary.firstRefreshDate
            ? Math.max(1, Math.floor((today.getTime() - new Date(`${summary.firstRefreshDate}T00:00:00.000Z`).getTime()) / (24 * 60 * 60 * 1000)) + 1)
            : 0;

        return {
            daily,
            topRange,
            topUsers,
            dailyRange,
            totalsByRole,
            recentRefreshes,
            dailyWindowDays: daily.length,
            totalsByType: normalizedTotalsByType,
            summary: {
                total: summary.total,
                busiestDay: summary.busiestDay,
                uniqueUsers: summary.uniqueUsers,
                busiestCount: summary.busiestCount,
                avgPerDay: summary.total && activeDays ? Math.round((summary.total / activeDays) * 10) / 10 : 0,
            },
        };
    }

    async getApiMonitoringStats({ range = "30d", dailyRange = "30d", recentPage = 1 }: AdminApiMonitoringParams = {}) {
        await this.flushProviderApiRedisRollups().catch();
        const rangeDays = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, all: null };

        const selectedDays = rangeDays[range];
        const dailyDays = rangeDays[dailyRange];
        const today = new Date(new Date().setUTCHours(0, 0, 0, 0));

        const [providers, dailyByProvider, totalsByProvider, statusTotals, summary, recentCalls, liveRedis] = await Promise.all([
            this.repository.getApiCallProviders(),
            this.repository.getApiCallDailyCountsByProvider(dailyDays),
            this.repository.getApiCallTotalsByProvider(selectedDays),
            this.repository.getApiCallStatusTotals(selectedDays),
            this.repository.getApiCallSummary(selectedDays),
            this.repository.getRecentApiCalls(recentPage),
            this._getProviderApiRedisSnapshot().catch((err) => {
                logger.warn({ err }, "Failed to read provider API live Redis snapshot");
                return null;
            }),
        ]);

        const firstCallDate = summary.firstCallAt ? new Date(summary.firstCallAt) : null;
        const providerKeys = providers.length > 0 ? providers : totalsByProvider.map((row) => row.provider);
        const countsByKey = new Map(dailyByProvider.map((row) => [`${row.date}|${row.provider}`, Number(row.count)]));

        const dailyStartDate = (dailyRange === "all")
            ? (firstCallDate ? new Date(firstCallDate.setUTCHours(0, 0, 0, 0)) : null)
            : new Date(today.getTime() - ((dailyDays ?? 1) - 1) * 24 * 60 * 60 * 1000);

        const daily = dailyStartDate
            ? this._buildDailySeriesByKey(dailyStartDate, today, providerKeys, countsByKey)
            : [];

        const rangeStart = selectedDays
            ? Date.now() - (selectedDays * 24 * 60 * 60 * 1000)
            : summary.firstCallAt ? new Date(summary.firstCallAt).getTime() : null;

        const activeSeconds = rangeStart ? Math.max(1, Math.floor((Date.now() - rangeStart) / 1000)) : 0;
        const activeDays = rangeStart ? Math.max(1, Math.ceil((Date.now() - rangeStart) / (24 * 60 * 60 * 1000))) : 0;

        return {
            daily,
            range,
            liveRedis,
            dailyRange,
            recentCalls,
            statusTotals,
            totalsByProvider,
            providers: providerKeys,
            dailyWindowDays: daily.length,
            summary: {
                ...summary,
                avgPerDay: summary.total && activeDays ? Math.round((summary.total / activeDays) * 10) / 10 : 0,
                avgPerSecond: summary.total && activeSeconds ? Math.round((summary.total / activeSeconds) * 10000) / 10000 : 0,
            },
        };
    }

    async flushProviderApiRedisRollups(cutoffMinuteMs?: number) {
        if (!serverEnv.REDIS_ENABLED) return { flushed: 0 };

        const redis = await getRedisConnection();
        const cutOff = cutoffMinuteMs ?? (Math.floor(Date.now() / 60_000) * 60_000) - 60_000;

        let flushed = 0;
        const members = await redis.zrangebyscore(PENDING_ROLLUPS_KEY, 0, cutOff);

        for (const member of members) {
            const [bucket, provider] = member.split("|");
            const bucketStartMs = Number(bucket);

            if (!provider || !Number.isFinite(bucketStartMs)) {
                await redis.zrem(PENDING_ROLLUPS_KEY, member);
                continue;
            }

            const lockKey = `api-monitor:rollups:lock:${member}`;
            const lockAcquired = await redis.set(lockKey, "1", "EX", 120, "NX");
            if (lockAcquired !== "OK") {
                continue;
            }

            const rollupKey = getRollupKey(bucketStartMs, provider);
            const secondsKey = getRollupKey(bucketStartMs, provider, { seconds: true });
            const statusKey = getRollupKey(bucketStartMs, provider, { statuses: true });

            try {
                const [rollupData, statusData, secondData] = await Promise.all([
                    redis.hgetall(rollupKey),
                    redis.hgetall(statusKey),
                    redis.hgetall(secondsKey),
                ]);

                const total = Number(rollupData.total ?? 0);
                if (total <= 0) {
                    await redis.zrem(PENDING_ROLLUPS_KEY, member);
                    continue;
                }

                await this.repository.upsertApiCallRollup({
                    total,
                    provider,
                    bucketStartMs,
                    errors: Number(rollupData.errors ?? 0),
                    durationMsTotal: Number(rollupData.durationMsTotal ?? 0),
                    maxSecondBurst: Math.max(0, ...Object.values(secondData).map(Number)),
                    statusCounts: Object.fromEntries(Object.entries(statusData).map(([k, v]) => [k, Number(v)])),
                });

                await redis
                    .pipeline()
                    .del(rollupKey)
                    .del(statusKey)
                    .del(secondsKey)
                    .zrem(PENDING_ROLLUPS_KEY, member)
                    .exec();

                flushed += 1;
            }
            finally {
                await redis.del(lockKey);
            }
        }

        return { flushed };
    };

    private async _getProviderApiRedisSnapshot() {
        if (!serverEnv.REDIS_ENABLED) return null;

        const redis = await getRedisConnection();

        const pipeline = redis.pipeline();
        const currentSecond = Math.floor(Date.now() / 1000);
        const seconds = Array.from({ length: 60 }, (_value, idx) => currentSecond - idx);

        for (const second of seconds) {
            pipeline.hgetall(`api-monitor:second:${second}`);
        }

        const rows = await pipeline.exec();
        if (!rows) return null;

        let lastMinuteTotal = 0;
        let peakSecondCount = 0;
        let currentSecondTotal = 0;
        let peakSecondAt: string | null = null;

        rows.forEach(([err, value], idx) => {
            if (err || !value) return;

            const second = seconds[idx] ?? currentSecond;
            const total = Number((value as Record<string, string>).total ?? 0);

            lastMinuteTotal += total;
            if (idx === 0) currentSecondTotal = total;

            if (total > peakSecondCount) {
                peakSecondCount = total;
                peakSecondAt = new Date(second * 1000).toISOString();
            }
        });

        return {
            peakSecondAt,
            lastMinuteTotal,
            peakSecondCount,
            currentSecondTotal,
            avgPerSecondLastMinute: Math.round((lastMinuteTotal / 60) * 100) / 100,
        };
    };

    private _buildDailySeriesByKey = <TKey extends string>(startDate: Date, endDate: Date, keys: TKey[], countsMap: Map<string, number>) => {
        const days = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

        return Array.from({ length: days }, (_value, idx) => {
            const date = new Date(startDate);
            date.setUTCDate(startDate.getUTCDate() + idx);
            const dateKey = date.toISOString().slice(0, 10);
            const entry: Record<string, number | string> = { date: dateKey, total: 0 };

            for (const key of keys) {
                const value = countsMap.get(`${dateKey}|${key}`) ?? 0;
                entry[key] = value;
                entry.total = Number(entry.total) + value;
            }

            return entry as { date: string; total: number } & Record<TKey, number>;
        });
    };
}
