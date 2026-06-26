import {HallOfFameSearch} from "@/lib/schemas";
import {DeltaStats} from "@/lib/types/stats.types";
import {MediaType, Status} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {UserMediaStats} from "@/lib/types/user-media.types";
import {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {UserStatsRepository} from "@/lib/server/domain/user/user-stats.repository";
import {UserActivityService} from "@/lib/server/domain/user/user-activity.service";
import {UserUpdatesRepository} from "@/lib/server/domain/user/user-updates.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";


export class UserStatsService {
    constructor(
        private repository: typeof UserStatsRepository,
        private userActivityService: UserActivityService,
        private achievementsRepository: typeof AchievementsRepository,
        private userUpdatesRepository: typeof UserUpdatesRepository,
        private mediaServiceRegistry: typeof MediaServiceRegistry,
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

    async userHalloFameData(filters: HallOfFameSearch, userId?: number) {
        const {
            mediaTypes,
            currentUserRankData,
            mediaTypeCountMap,
            currentUserActiveSettings,
            rankedUsers,
            userSettingsMap,
            rankSelectionColName,
            page, pages, total,
        } = await this.repository.userHalloFameData(filters, userId);

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
        return this._getComputedStatsSummary({ userId });
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
        const userPreComputedStats = await this._getComputedStatsSummary({ userId });
        const platinumAchievements = await this.achievementsRepository.countPlatinumAchievements(userId);
        const mediaUpdatesPerMonth = await this.userUpdatesRepository.mediaUpdatesStatsPerMonth({ userId });
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ userId });

        const tagCountPromises = userPreComputedStats.mediaTypes.map((mediaType) => {
            const mediaService = this.mediaServiceRegistry.getService(mediaType);
            return mediaService.computeTotalTags(userId);
        });
        const tagCounts = await Promise.all(tagCountPromises);
        const totalTags = tagCounts.reduce((sum, count) => sum + count, 0);

        return {
            ...userPreComputedStats,
            totalTags,
            activityByMonth,
            platinumAchievements,
            updatesPerMonth: mediaUpdatesPerMonth,
        };
    }

    async userAdvancedMediaStats(userId: number, mediaType: MediaType) {
        const mediaService = this.mediaServiceRegistry.getService(mediaType);

        const preComputedMediaStats = await this.repository.getAggregatedMediaStats({ userId, mediaType });
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ userId, mediaType });
        const specificMediaStats = await mediaService.calculateAdvancedMediaStats(preComputedMediaStats.avgRated, userId);
        const mediaUpdatesPerMonthStats = await this.userUpdatesRepository.mediaUpdatesStatsPerMonth({ mediaType, userId });

        return {
            ...preComputedMediaStats,
            ...mediaUpdatesPerMonthStats,
            activityByMonth,
            specificMediaStats,
        };
    }

    // --- Platform Advanced Stats -----------------------------------------------

    async platformAdvancedStatsSummary() {
        const platformPreComputedStats = await this._getComputedStatsSummary({});
        const platinumAchievements = await this.achievementsRepository.countPlatinumAchievements();
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ excludeBulkImports: true });
        const mediaUpdatesPerMonth = await this.userUpdatesRepository.mediaUpdatesStatsPerMonth({ excludeBulkImports: true });

        const tagCountPromises = platformPreComputedStats.mediaTypes.map((mediaType) => {
            const mediaService = this.mediaServiceRegistry.getService(mediaType);
            return mediaService.computeTotalTags();
        });
        const tagCounts = await Promise.all(tagCountPromises);
        const totalTags = tagCounts.reduce((sum, count) => sum + count, 0);

        return {
            ...platformPreComputedStats,
            totalTags,
            activityByMonth,
            platinumAchievements,
            updatesPerMonth: mediaUpdatesPerMonth,
        };
    }

    async platformMediaAdvancedStats(mediaType: MediaType) {
        const mediaService = this.mediaServiceRegistry.getService(mediaType);

        const platformPreComputedStats = await this.repository.getAggregatedMediaStats({ mediaType });
        const specificMediaStats = await mediaService.calculateAdvancedMediaStats(platformPreComputedStats.avgRated);
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ mediaType, excludeBulkImports: true });
        const mediaUpdatesPerMonthStats = await this.userUpdatesRepository.mediaUpdatesStatsPerMonth({ mediaType, excludeBulkImports: true });

        return {
            ...platformPreComputedStats,
            ...mediaUpdatesPerMonthStats,
            activityByMonth,
            specificMediaStats,
        };
    }

    private async _getComputedStatsSummary({ userId }: { userId?: number }) {
        const {
            preComputedStats,
            statusCountsList,
            mediaTimeDistribution,
            totalUsers,
        } = await this.repository.getPreComputedStatsSummary({ userId });

        const {
            totalHours,
            totalEntries,
            totalFavorites,
            totalComments,
            totalRedo,
            totalRated,
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
            mediaTypes: mediaTimeDistribution.map((d) => d.name),
            ...(userId ? {} : { totalUsers }),
        };
    }
}
