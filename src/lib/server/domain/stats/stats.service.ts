import {HallOfFameSearch} from "@/lib/schemas";
import {DeltaStats} from "@/lib/types/stats.types";
import {MediaType, Status} from "@/lib/utils/enums";
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

    updateUserMediaListSettings(userId: number, payload: Partial<Record<MediaType, boolean>>, notifications: Record<MediaType, boolean>) {
        this.repository.updateUserMediaListSettings(userId, payload, notifications);
    }

    updateUserPreComputedStatsWithDelta(userId: number, mediaType: MediaType, mediaId: number, delta: DeltaStats) {
        this.repository.updateUserPreComputedStatsWithDelta(userId, mediaType, mediaId, delta);
    }

    updateAllUsersPreComputedStats(mediaType: MediaType, userStats: UserMediaStats[]) {
        this.repository.updateAllUsersPreComputedStats(mediaType, userStats);
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
        const { mediaBreakdown: _mediaBreakdown, ...summary } = await this.getComputedStatsSummary({ userId });
        return summary;
    }

    async userPerMediaSummaryStats(userId: number) {
        const activeSettings = await this.repository.userActiveMediaSettings(userId);

        const data = [];
        for (const setting of activeSettings) {
            const totalNoPlan = setting.totalEntries - (setting.statusCounts[Status.PLANNED] ?? 0);

            const statusList = Object.entries(setting.statusCounts)
                .map(([status, count]) =>
                    ({ status: status as Status, count, percent: setting.totalEntries === 0 ? 0 : (count / setting.totalEntries) * 100 })
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
                percentRated: (setting.entriesRated === 0 || totalNoPlan === 0) ? null : (setting.entriesRated / totalNoPlan) * 100,
            };

            data.push(summary);
        }

        return data;
    }

    // --- User Advanced Stats  --------------------------------------------------

    userAdvancedSummaryStats(userId: number) {
        return this.getAdvancedSummaryStats(userId);
    }

    userAdvancedMediaStats(userId: number, mediaType: MediaType) {
        return this.getAdvancedMediaStats(mediaType, userId);
    }

    // --- Platform Advanced Stats -----------------------------------------------

    platformAdvancedStatsSummary() {
        return this.getAdvancedSummaryStats();
    }

    platformMediaAdvancedStats(mediaType: MediaType) {
        return this.getAdvancedMediaStats(mediaType);
    }

    private async getAdvancedSummaryStats(userId?: number) {
        const activityScope = userId === undefined ? { excludeBulkImports: true } : { userId };
        const [preComputedStats, activityByMonth, platinumAchievements, updateFingerprint] = await Promise.all([
            this.getComputedStatsSummary({ userId }),
            this.activityService.getActivityStatsByMonth(activityScope),
            this.achievementsRepository.countPlatinumAchievements(userId),
            this.updateHistoryRepository.mediaUpdateFingerprint(activityScope),
        ]);

        const tagCounts = await Promise.all(preComputedStats.mediaTypes.map(mediaType =>
            this.mediaStatsRegistry.get(mediaType).computeTotalTags(userId)
        ));

        return {
            ...preComputedStats,
            activityByMonth,
            updateFingerprint,
            platinumAchievements,
            totalTags: tagCounts.reduce((sum, count) => sum + count, 0),
        };
    }

    private async getAdvancedMediaStats(mediaType: MediaType, userId?: number) {
        const mediaStatistics = this.mediaStatsRegistry.get(mediaType);

        const activityScope = userId === undefined
            ? { mediaType, excludeBulkImports: true }
            : { mediaType, userId };

        const preComputedMediaStats = await this.repository.getAggregatedMediaStats({ userId, mediaType });

        const [activityByMonth, updateFingerprint, specificMediaStats] = await Promise.all([
            this.activityService.getActivityStatsByMonth(activityScope),
            this.updateHistoryRepository.mediaUpdateFingerprint(activityScope),
            mediaStatistics.calculateAdvancedMediaStats(preComputedMediaStats.avgRated, userId),
        ]);

        return {
            ...preComputedMediaStats,
            activityByMonth,
            updateFingerprint,
            specificMediaStats,
        };
    }

    private async getComputedStatsSummary({ userId }: { userId?: number }) {
        const { totalUsers, mediaBreakdown, preComputedStats, mediaTimeDistribution } = await this.repository.getPreComputedStatsSummary({ userId });
        const { totalRedo, totalRated, totalHours, totalEntries, totalComments, totalFavorites, sumOfAllRatings, distinctMediaTypes } = preComputedStats;

        const totalEntriesNoPlan = mediaBreakdown.reduce((total, media) => total + media.totalEntriesNoPlan, 0);

        const avgRated = (totalRated === 0) ? null : (sumOfAllRatings / totalRated);
        const percentRated = (totalEntriesNoPlan === 0) ? null : (totalRated / totalEntriesNoPlan) * 100;

        // The divisor for averages changes based on context
        const avgDivisor = userId ? distinctMediaTypes : totalUsers;
        const avgComments = (avgDivisor === 0) ? null : (totalComments / avgDivisor);
        const avgFavorites = (avgDivisor === 0) ? null : (totalFavorites / avgDivisor);

        const mediaBreakdownWithRatios = mediaBreakdown.map((media) => {
            const totalRatedForMedia = media.totalRated ?? 0;
            const totalEntriesForMedia = media.totalEntries ?? 0;
            const totalEntriesNoPlanForMedia = media.totalEntriesNoPlan;

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
