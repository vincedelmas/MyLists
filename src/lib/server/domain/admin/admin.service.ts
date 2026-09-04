import {serverEnv} from "@/env/server";
import {SearchType} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {logger} from "@/lib/server/core/logger";
import {SaveTaskToDb} from "@/lib/types/tasks.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {getRedisConnection} from "@/lib/server/core/redis-client";
import {getYearRecapReleaseStatus} from "@/lib/utils/year-recap-release";
import type {AdminRepository} from "@/lib/server/domain/admin/admin.repository";
import {getRollupKey, PENDING_ROLLUPS_KEY} from "@/lib/server/core/cache-keys";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {YEAR_RECAP_FIRST_YEAR, YearRecapReleaseMode} from "@/lib/types/year-recap.types";
import {AdminApiMonitoringParams, AdminMediaRefreshStatsParams} from "@/lib/types/admin.types";


export const createAdminService = (repository: AdminRepository) => {
    const getProviderApiRedisSnapshot = async () => {
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

    const buildDailySeriesByKey = <TKey extends string, TDatum>(
        startDate: Date,
        endDate: Date,
        keys: readonly TKey[],
        countsMap: Map<string, number>,
        createDatum: (date: string, key: TKey, count: number) => TDatum,
    ) => {
        const dayCount = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

        const data = Array.from({ length: dayCount }, (_value, idx) => {
            const date = new Date(startDate);
            date.setUTCDate(startDate.getUTCDate() + idx);
            const dateKey = date.toISOString().slice(0, 10);

            return keys.map((key) => createDatum(dateKey, key, countsMap.get(`${dateKey}|${key}`) ?? 0));
        }).flat();

        return { data, dayCount };
    };

    const service = {
        async saveTaskToDb(data: SaveTaskToDb) {
            return repository.saveTaskToDb(data);
        },

        async getYearRecapReleaseStatus(year: number, now = new Date()) {
            const mode = await repository.getYearRecapReleaseMode(year);
            return getYearRecapReleaseStatus(year, mode, now);
        },

        async getYearRecapReleases(now = new Date()) {
            const currentYear = now.getUTCFullYear();
            if (currentYear < YEAR_RECAP_FIRST_YEAR) return [];

            const overrides = await repository.getYearRecapReleaseModes(YEAR_RECAP_FIRST_YEAR, currentYear);
            const modes = new Map(overrides.map(({ year, mode }) => [year, mode]));

            return Array.from({ length: currentYear - YEAR_RECAP_FIRST_YEAR + 1 }, (_, index) => {
                const year = currentYear - index;
                return getYearRecapReleaseStatus(year, modes.get(year) ?? "automatic", now);
            });
        },

        async updateYearRecapReleaseMode(year: number, mode: YearRecapReleaseMode) {
            const currentYear = new Date().getUTCFullYear();
            if (year < YEAR_RECAP_FIRST_YEAR || year > currentYear) {
                throw new FormattedError("This recap year cannot be configured");
            }

            await repository.updateYearRecapReleaseMode(year, mode);
            return service.getYearRecapReleaseStatus(year);
        },

        async getArchivedTasksForAdmin() {
            return repository.getArchivedTasksForAdmin();
        },

        async deleteArchivedTaskForAdmin(taskId: string) {
            return repository.deleteArchivedTaskForAdmin(taskId);
        },

        async getMediaOverviewForAdmin(mediaServiceRegistry: MediaServiceRegistry) {
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
        },

        async getCollectionsOverviewForAdmin() {
            const [overview, createdPerMonth] = await Promise.all([
                repository.getCollectionsOverview(),
                repository.getCollectionsCreatedPerMonth(),
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
        },

        async getPaginatedCollectionsForAdmin(data: SearchType) {
            return repository.getPaginatedCollectionsForAdmin(data);
        },

        async logMediaRefresh(params: { userId: number; mediaType: MediaType; apiId: number | string }) {
            return repository.logMediaRefresh(params);
        },

        async getMediaRefreshStats({ dailyRange = "30d", topRange = "all", recentPage = 1 }: AdminMediaRefreshStatsParams = {}) {
            const mediaRefreshRangeDays = { "30d": 30, "90d": 90, "1y": 365, all: null };

            const mediaTypes = Object.values(MediaType);
            const topDays = mediaRefreshRangeDays[topRange];
            const dailyDays = mediaRefreshRangeDays[dailyRange];
            const today = new Date(new Date().setUTCHours(0, 0, 0, 0));

            const [dailyByType, topUsers, totalsByRole, totalsByType, summary, recentRefreshes] = await Promise.all([
                repository.getMediaRefreshDailyCountsByType(dailyDays),
                repository.getMediaRefreshTopUsers(topDays),
                repository.getMediaRefreshTotalsByRole(),
                repository.getMediaRefreshTotalsByType(),
                repository.getMediaRefreshSummary(),
                repository.getRecentMediaRefreshes(recentPage),
            ]);

            const countsByKey = new Map(dailyByType.map((row) => [`${row.date}|${row.mediaType}`, Number(row.count)]));

            const dailyStartDate = (dailyRange === "all")
                ? (summary.firstRefreshDate ? new Date(`${summary.firstRefreshDate}T00:00:00.000Z`) : null)
                : new Date(today.getTime() - ((dailyDays ?? 1) - 1) * 24 * 60 * 60 * 1000);

            const dailySeries = dailyStartDate
                ? buildDailySeriesByKey(
                    dailyStartDate,
                    today,
                    mediaTypes,
                    countsByKey,
                    (date, mediaType, count) => ({ date, mediaType, count }),
                )
                : { data: [], dayCount: 0 };

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
                daily: dailySeries.data,
                topRange,
                topUsers,
                dailyRange,
                totalsByRole,
                recentRefreshes,
                dailyWindowDays: dailySeries.dayCount,
                totalsByType: normalizedTotalsByType,
                summary: {
                    total: summary.total,
                    busiestDay: summary.busiestDay,
                    uniqueUsers: summary.uniqueUsers,
                    busiestCount: summary.busiestCount,
                    avgPerDay: summary.total && activeDays ? Math.round((summary.total / activeDays) * 10) / 10 : 0,
                },
            };
        },

        async getApiMonitoringStats({ range = "30d", dailyRange = "30d", recentPage = 1 }: AdminApiMonitoringParams = {}) {
            await service.flushProviderApiRedisRollups()
                .catch((err) => logger.warn({ err }, "Failed to flush provider API Redis rollups before reading stats"));

            const rangeDays = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, all: null };

            const selectedDays = rangeDays[range];
            const dailyDays = rangeDays[dailyRange];
            const today = new Date(new Date().setUTCHours(0, 0, 0, 0));

            const [providers, dailyByProvider, totalsByProvider, statusTotals, summary, recentCalls, liveRedis] = await Promise.all([
                repository.getApiCallProviders(),
                repository.getApiCallDailyCountsByProvider(dailyDays),
                repository.getApiCallTotalsByProvider(selectedDays),
                repository.getApiCallStatusTotals(),
                repository.getApiCallSummary(),
                repository.getRecentApiCalls(recentPage),
                getProviderApiRedisSnapshot().catch((err) => {
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

            const dailySeries = dailyStartDate
                ? buildDailySeriesByKey(
                    dailyStartDate,
                    today,
                    providerKeys,
                    countsByKey,
                    (date, provider, count) => ({ date, provider, count }),
                )
                : { data: [], dayCount: 0 };

            const firstCallAtMs = summary.firstCallAt ? new Date(summary.firstCallAt).getTime() : null;
            const firstCallDayMs = summary.firstCallAt ? new Date(summary.firstCallAt).setUTCHours(0, 0, 0, 0) : null;

            const activeSeconds = firstCallAtMs !== null ? Math.max(1, Math.floor((Date.now() - firstCallAtMs) / 1000)) : 0;
            const activeDays = firstCallDayMs !== null
                ? Math.max(1, Math.floor((today.getTime() - firstCallDayMs) / (24 * 60 * 60 * 1000)) + 1)
                : 0;

            return {
                range,
                liveRedis,
                dailyRange,
                recentCalls,
                statusTotals,
                totalsByProvider,
                daily: dailySeries.data,
                providers: providerKeys,
                dailyWindowDays: dailySeries.dayCount,
                summary: {
                    ...summary,
                    avgPerSecond: summary.total && activeSeconds ? summary.total / activeSeconds : 0,
                    avgPerDay: summary.total && activeDays ? Math.round((summary.total / activeDays) * 10) / 10 : 0,
                },
            };
        },

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

                    await repository.upsertApiCallRollup({
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
        },
    };

    return service;
};
