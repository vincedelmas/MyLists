import {MediaType} from "@/lib/utils/enums";
import {ActivityService} from "@/lib/server/domain/activity/activity.service";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {ProfileUpdatesQuery} from "@/lib/server/domain/profile/profile-updates.query";
import {AchievementService} from "@/lib/server/domain/achievements/achievement.service";
import {StatsSummaryRepository} from "@/lib/server/domain/stats/stats-summary.repository";
import {StatsSummaryReadService} from "@/lib/server/domain/stats/stats-summary-read.service";
import {ProfileChannelAccessRepository} from "@/lib/server/domain/access/profile-channel-access.repository";
import {MediaModuleRegistry} from "@/lib/server/domain/media/media-module.registry";


export class UserStatsService {
    private readonly summary = new StatsSummaryReadService();
    private readonly updates = new ProfileUpdatesQuery();
    private readonly achievements = AchievementService;
    private readonly profileChannels = new ProfileChannelAccessRepository();

    constructor(
        private activityService: ActivityService,
        private readonly media: MediaModuleRegistry,
    ) {
    }

    async updateUserMediaListSettings(userId: number, payload: Partial<Record<MediaType, boolean>>) {
        await this.profileChannels.updateSettings(userId, payload);
    }

    // --- User Profile Summary Stats --------------------------------------------

    async userPreComputedStatsSummary(userId: number) {
        return this._getComputedStatsSummary({ userId });
    }

    async userPerMediaSummaryStats(userId: number) {
        return this.summary.getPerMediaSummary(userId);
    }

    // --- User Advanced Stats  --------------------------------------------------

    async userAdvancedSummaryStats(userId: number) {
        const userPreComputedStats = await this._getComputedStatsSummary({ userId });
        const platinumAchievements = await this.achievements.countPlatinumAchievements(userId);
        const mediaUpdatesPerMonth = await this.updates.mediaUpdatesStatsPerMonth({ userId });
        const activityByMonth = await this.activityService.getActivityStatsByMonth({ userId });

        const totalTags = await StatsSummaryRepository.countTags(userPreComputedStats.mediaTypes, userId);

        return {
            ...userPreComputedStats,
            totalTags,
            activityByMonth,
            platinumAchievements,
            updatesPerMonth: mediaUpdatesPerMonth,
        };
    }

    async userAdvancedMediaStats(userId: number, mediaType: MediaType, access?: MediaListAccessScope) {
        if (!access) throw new Error("Media stats access scope is required");

        const stats = this.media.get(mediaType).library.stats;
        const preComputedMediaStats = await stats.getAggregatedMediaStats({ type: "library", access });
        const specificMediaStats = await stats.getAdvancedMediaStats({ type: "library", access }, preComputedMediaStats.avgRated);
        
        const activityByMonth = await this.activityService.getActivityStatsByMonth({ userId, mediaType });
        const mediaUpdatesPerMonthStats = await this.updates.mediaUpdatesStatsPerMonth({ mediaType, userId });

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
        const platinumAchievements = await this.achievements.countPlatinumAchievements();
        const activityByMonth = await this.activityService.getActivityStatsByMonth({ excludeBulkImports: true });
        const mediaUpdatesPerMonth = await this.updates.mediaUpdatesStatsPerMonth({ excludeBulkImports: true });

        const totalTags = await StatsSummaryRepository.countTags(platformPreComputedStats.mediaTypes);

        return {
            ...platformPreComputedStats,
            totalTags,
            activityByMonth,
            platinumAchievements,
            updatesPerMonth: mediaUpdatesPerMonth,
        };
    }

    async platformMediaAdvancedStats(mediaType: MediaType) {
        const stats = this.media.get(mediaType).library.stats;
        const platformPreComputedStats = await stats.getAggregatedMediaStats({ type: "platform" });
        const specificMediaStats = await stats.getAdvancedMediaStats(
            { type: "platform" },
            platformPreComputedStats.avgRated,
        );
        const activityByMonth = await this.activityService.getActivityStatsByMonth({ mediaType, excludeBulkImports: true });
        const mediaUpdatesPerMonthStats = await this.updates.mediaUpdatesStatsPerMonth({ mediaType, excludeBulkImports: true });

        return {
            ...platformPreComputedStats,
            ...mediaUpdatesPerMonthStats,
            activityByMonth,
            specificMediaStats,
        };
    }

    private async _getComputedStatsSummary({ userId }: { userId?: number }) {
        return this.summary.getSummary(userId);
    }
}
