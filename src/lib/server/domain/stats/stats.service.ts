import {HallOfFameSearch} from "@/lib/schemas";
import {DeltaStats} from "@/lib/types/stats.types";
import {MediaType, Status} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {UserMediaStats} from "@/lib/types/user-media.types";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {MediaStatsRegistry} from "@/lib/server/domain/media/media.registries";
import {MonthlyActivityService} from "@/lib/server/domain/tracking/monthly-activity.service";
import {UpdateHistoryRepository} from "@/lib/server/domain/tracking/update-history.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";


export class StatsService {
    constructor(
        private repository: typeof StatsRepository,
        private activityService: MonthlyActivityService,
        private achievementsRepository: typeof AchievementsRepository,
        private updateHistoryRepository: typeof UpdateHistoryRepository,
        private mediaStatsRegistry: MediaStatsRegistry,
    ) {
    }

    async updateUserMediaListSettings(userId: number, payload: Partial<Record<MediaType, boolean>>) {
        await this.repository.updateUserMediaListSettings(userId, payload);
    }

    async updateUserPreComputedStatsWithDelta(userId: number, mediaType: MediaType, mediaId: number, delta: DeltaStats) {
        await this.repository.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
    }

    async updateAllUsersPreComputedStats(mediaType: MediaType, userStats: UserMediaStats[]) {
        await this.repository.updateAllUsersPreComputedStats(mediaType, userStats);
    }

    async userHallOfFameData(filters: HallOfFameSearch, userId?: number) {
        const {
            mediaTypes,
            currentUserRankData,
            mediaTypeCountMap,
            currentUserActiveSettings,
            rankedUsers,
            userSettingsMap,
            rankSelectionColName,
            page, pages, total,
        } = await this.repository.userHallOfFameData(filters, userId);

        // Calculate Current User's Percentile Ranks
        const userRanks = [];
        for (const mediaType of mediaTypes) {
            let percent: number | null = null;
            const rankKey = `${mediaType}Rank` as keyof typeof currentUserRankData;

            const rank = (currentUserRankData?.[rankKey] as unknown as number) ?? null;
            const mtCount = mediaTypeCountMap.get(mediaType) ?? 0;
            const active = currentUserActiveSettings.has(mediaType);

            if (rank !== null && active) {
                if (mtCount === 0) {
                    percent = null;
                }
                else if (mtCount === 1 && rank === 1) {
                    percent = 100;
                }
                else if (rank > mtCount) {
                    percent = null;
                }
                else {
                    percent = (rank / mtCount) * 100;
                }
            }

            userRanks.push({ rank, active, mediaType, percent });
        }

        const items = rankedUsers.map((row) => {
            return {
                id: row.id,
                name: row.name,
                image: row.image,
                privacy: row.privacy,
                totalTime: row.totalTime,
                settings: userSettingsMap.get(row.id) ?? [],
                rank: (row[rankSelectionColName as keyof typeof row] as number) ?? null,
            }
        });

        return { items, page, pages, total, userRanks }
    }

    // --- User Profile Summary Stats --------------------------------------------

    async userPreComputedStatsSummary(userId: number) {
        const { mediaBreakdown: _mediaBreakdown, ...summary } = await this._getComputedStatsSummary({ userId });
        return summary;
    }

    async userPerMediaSummaryStats(userId: number) {
        const excludedStatuses = statusUtils.getNoPlanTo();
        const activeSettings = await this.repository.userActiveMediaSettings(userId);

        const data = [];
        for (const setting of activeSettings) {
            let totalNoPlan = 0;
            Object.entries(setting.statusCounts).forEach(([status, count]) => {
                if (!excludedStatuses.includes(status as Status)) {
                    totalNoPlan += count;
                }
            });

            const statusList = Object.entries(setting.statusCounts)
                .map(([status, count]) =>
                    ({ status: status as Status, count, percent: (count / setting.totalEntries) * 100 })
                );

            const summary = {
                statusList: statusList,
                totalNoPlan: totalNoPlan,
                mediaType: setting.mediaType,
                avgRated: setting.averageRating,
                timeSpent: setting.timeSpent / 60,
                noData: setting.totalEntries === 0,
                totalEntries: setting.totalEntries,
                entriesRated: setting.entriesRated,
                totalSpecific: setting.totalSpecific,
                timeSpentDays: setting.timeSpent / 1440,
                entriesFavorites: setting.entriesFavorites,
                percentRated: (setting.entriesRated === 0) ? null : (setting.entriesRated / totalNoPlan) * 100,
            };

            data.push(summary);
        }

        return data;
    }

    // --- User Advanced Stats  --------------------------------------------------

    async userAdvancedSummaryStats(userId: number) {
        const [userPreComputedStats, platinumAchievements, updateFingerprint, activityByMonth] = await Promise.all([
            this._getComputedStatsSummary({ userId }),
            this.achievementsRepository.countPlatinumAchievements(userId),
            this.updateHistoryRepository.mediaUpdateFingerprint({ userId }),
            this.activityService.getActivityStatsByMonth({ userId }),
        ]);

        const tagCountPromises = userPreComputedStats.mediaTypes.map((mediaType) => {
            const mediaStatistics = this.mediaStatsRegistry.get(mediaType);
            return mediaStatistics.computeTotalTags(userId);
        });
        const tagCounts = await Promise.all(tagCountPromises);
        const totalTags = tagCounts.reduce((sum, count) => sum + count, 0);

        return {
            ...userPreComputedStats,
            totalTags,
            activityByMonth,
            updateFingerprint,
            platinumAchievements,
        };
    }

    async userAdvancedMediaStats(userId: number, mediaType: MediaType) {
        const mediaStatistics = this.mediaStatsRegistry.get(mediaType);

        const preComputedMediaStats = await this.repository.getAggregatedMediaStats({ userId, mediaType });

        const [activityByMonth, specificMediaStats, updateFingerprint] = await Promise.all([
            this.activityService.getActivityStatsByMonth({ userId, mediaType }),
            mediaStatistics.calculateAdvancedMediaStats(preComputedMediaStats.avgRated, userId),
            this.updateHistoryRepository.mediaUpdateFingerprint({ mediaType, userId }),
        ]);

        return {
            ...preComputedMediaStats,
            activityByMonth,
            updateFingerprint,
            specificMediaStats,
        };
    }

    // --- Platform Advanced Stats -----------------------------------------------

    async platformAdvancedStatsSummary() {
        const [platformPreComputedStats, platinumAchievements, activityByMonth, updateFingerprint] = await Promise.all([
            this._getComputedStatsSummary({}),
            this.achievementsRepository.countPlatinumAchievements(),
            this.activityService.getActivityStatsByMonth({ excludeBulkImports: true }),
            this.updateHistoryRepository.mediaUpdateFingerprint({ excludeBulkImports: true }),
        ]);

        const tagCountPromises = platformPreComputedStats.mediaTypes.map((mediaType) => {
            const mediaStatistics = this.mediaStatsRegistry.get(mediaType);
            return mediaStatistics.computeTotalTags();
        });
        const tagCounts = await Promise.all(tagCountPromises);
        const totalTags = tagCounts.reduce((sum, count) => sum + count, 0);

        return {
            ...platformPreComputedStats,
            totalTags,
            activityByMonth,
            updateFingerprint,
            platinumAchievements,
        };
    }

    async platformMediaAdvancedStats(mediaType: MediaType) {
        const mediaStatistics = this.mediaStatsRegistry.get(mediaType);
        const platformPreComputedStats = await this.repository.getAggregatedMediaStats({ mediaType });

        const [specificMediaStats, activityByMonth, updateFingerprint] = await Promise.all([
            mediaStatistics.calculateAdvancedMediaStats(platformPreComputedStats.avgRated),
            this.activityService.getActivityStatsByMonth({ mediaType, excludeBulkImports: true }),
            this.updateHistoryRepository.mediaUpdateFingerprint({ mediaType, excludeBulkImports: true }),
        ]);

        return {
            ...platformPreComputedStats,
            activityByMonth,
            updateFingerprint,
            specificMediaStats,
        };
    }

    private async _getComputedStatsSummary({ userId }: { userId?: number }) {
        const {
            preComputedStats,
            statusCountsList,
            mediaTimeDistribution,
            mediaBreakdown,
            totalUsers,
        } = await this.repository.getPreComputedStatsSummary({ userId });

        const {
            totalRedo,
            totalRated,
            totalHours,
            totalEntries,
            totalComments,
            totalFavorites,
            sumOfAllRatings,
            distinctMediaTypes,
        } = preComputedStats;

        const excludedStatuses = statusUtils.getNoPlanTo();
        const totalEntriesNoPlan = statusCountsList.reduce((sum, setting) => {
            let settingSum = 0;
            for (const [status, count] of Object.entries(setting.statusCounts)) {
                if (!excludedStatuses.includes(status as Status)) {
                    settingSum += count;
                }
            }
            return sum + settingSum;
        }, 0);

        const avgRated = (totalRated === 0) ? null : (sumOfAllRatings / totalRated);
        const percentRated = (totalEntriesNoPlan === 0) ? null : (totalRated / totalEntriesNoPlan) * 100;

        // The divisor for averages changes based on context
        const avgDivisor = userId ? distinctMediaTypes : totalUsers;
        const avgComments = (avgDivisor === 0) ? null : (totalComments / avgDivisor);
        const avgFavorites = (avgDivisor === 0) ? null : (totalFavorites / avgDivisor);

        const noPlanByMediaType = new Map<MediaType, number>();
        for (const setting of statusCountsList) {
            const total = Object.entries(setting.statusCounts).reduce((sum, [status, count]) => {
                return excludedStatuses.includes(status as Status) ? sum : sum + count;
            }, 0);
            noPlanByMediaType.set(setting.mediaType, (noPlanByMediaType.get(setting.mediaType) ?? 0) + total);
        }

        const mediaBreakdownWithRatios = mediaBreakdown.map((media) => {
            const totalEntriesForMedia = media.totalEntries ?? 0;
            const totalEntriesNoPlanForMedia = noPlanByMediaType.get(media.mediaType) ?? 0;
            const totalRatedForMedia = media.totalRated ?? 0;

            return {
                mediaType: media.mediaType,
                activeUsers: media.activeUsers,
                totalRated: totalRatedForMedia,
                totalRedo: media.totalRedo ?? 0,
                totalEntries: totalEntriesForMedia,
                totalComments: media.totalComments ?? 0,
                totalFavorites: media.totalFavorites ?? 0,
                timeSpentHours: media.timeSpentHours ?? 0,
                totalEntriesNoPlan: totalEntriesNoPlanForMedia,
                avgRating: totalRatedForMedia === 0 ? null : (media.sumOfRatings ?? 0) / totalRatedForMedia,
                ratingCoverage: totalEntriesNoPlanForMedia === 0 ? null : (totalRatedForMedia / totalEntriesNoPlanForMedia) * 100,
            };
        });

        return {
            avgRated,
            totalRedo,
            totalRated,
            avgComments,
            percentRated,
            avgFavorites,
            totalEntries,
            totalComments,
            totalFavorites,
            totalEntriesNoPlan,
            mediaTimeDistribution,
            totalHours: totalHours,
            totalDays: totalHours / 24,
            mediaBreakdown: mediaBreakdownWithRatios,
            mediaTypes: mediaTimeDistribution.map((d) => d.name),
            ...(userId ? {} : { totalUsers }),
        };
    }
}
