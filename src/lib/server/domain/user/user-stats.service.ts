import {MediaType} from "@/lib/utils/enums";
import {UserActivityService} from "@/lib/server/domain/user/user-activity.service";
import {isTvKind} from "@/lib/server/domain/library/tv/tv-library-read.repository";
import {TvStatsReadRepository} from "@/lib/server/domain/library/tv/tv-stats-read.repository";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {MovieStatsReadRepository} from "@/lib/server/domain/library/movies/movie-stats-read.repository";
import {GameStatsReadRepository} from "@/lib/server/domain/library/games/game-stats-read.repository";
import {BookStatsReadRepository} from "@/lib/server/domain/library/books/book-stats-read.repository";
import {MangaStatsReadRepository} from "@/lib/server/domain/library/manga/manga-stats-read.repository";
import {StatsSummaryReadService} from "@/lib/server/domain/stats/stats-summary-read.service";
import {ProfileUpdatesQuery} from "@/lib/server/domain/profile/profile-updates.query";
import {AchievementsQuery} from "@/lib/server/domain/achievements/achievements.query";
import {StatsSummaryRepository} from "@/lib/server/domain/stats/stats-summary.repository";
import {ProfileChannelAccessRepository} from "@/lib/server/domain/access/profile-channel-access.repository";


export class UserStatsService {
    private readonly summary = new StatsSummaryReadService();
    private readonly updates = new ProfileUpdatesQuery();
    private readonly achievements = new AchievementsQuery();
    private readonly profileChannels = new ProfileChannelAccessRepository();

    constructor(
        private userActivityService: UserActivityService,
        private tvStatsReaders?: Record<TvMediaType, TvStatsReadRepository>,
        private movieStatsReader?: MovieStatsReadRepository,
        private gameStatsReader?: GameStatsReadRepository,
        private bookStatsReader?: BookStatsReadRepository,
        private mangaStatsReader?: MangaStatsReadRepository,
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
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ userId });

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
        const useTv = isTvKind(mediaType);
        const preComputedMediaStats = useTv
            ? await this.tvStatsReaders![mediaType].getAggregatedMediaStats({ type: "library", access: access! })
            : mediaType === MediaType.MOVIES
                ? await this.movieStatsReader!.getAggregatedMediaStats({ type: "library", access: access! })
                : mediaType === MediaType.GAMES
                    ? await this.gameStatsReader!.getAggregatedMediaStats({ type: "library", access: access! })
                    : mediaType === MediaType.BOOKS
                        ? await this.bookStatsReader!.getAggregatedMediaStats({ type: "library", access: access! })
                        : await this.mangaStatsReader!.getAggregatedMediaStats({ type: "library", access: access! });
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ userId, mediaType });
        const specificMediaStats = useTv
            ? await this.tvStatsReaders![mediaType].getAdvancedMediaStats({ type: "library", access: access! }, preComputedMediaStats.avgRated)
            : mediaType === MediaType.MOVIES
                ? await this.movieStatsReader!.getAdvancedMediaStats({ type: "library", access: access! }, preComputedMediaStats.avgRated)
                : mediaType === MediaType.GAMES
                    ? await this.gameStatsReader!.getAdvancedMediaStats({ type: "library", access: access! }, preComputedMediaStats.avgRated)
                    : mediaType === MediaType.BOOKS
                        ? await this.bookStatsReader!.getAdvancedMediaStats({ type: "library", access: access! }, preComputedMediaStats.avgRated)
                        : await this.mangaStatsReader!.getAdvancedMediaStats({ type: "library", access: access! }, preComputedMediaStats.avgRated);
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
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ excludeBulkImports: true });
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
        const useTv = isTvKind(mediaType);
        const platformPreComputedStats = useTv
            ? await this.tvStatsReaders![mediaType].getAggregatedMediaStats({ type: "platform" })
            : mediaType === MediaType.MOVIES
                ? await this.movieStatsReader!.getAggregatedMediaStats({ type: "platform" })
                : mediaType === MediaType.GAMES
                    ? await this.gameStatsReader!.getAggregatedMediaStats({ type: "platform" })
                    : mediaType === MediaType.BOOKS
                        ? await this.bookStatsReader!.getAggregatedMediaStats({ type: "platform" })
                        : await this.mangaStatsReader!.getAggregatedMediaStats({ type: "platform" });
        const specificMediaStats = useTv
            ? await this.tvStatsReaders![mediaType].getAdvancedMediaStats({ type: "platform" }, platformPreComputedStats.avgRated)
            : mediaType === MediaType.MOVIES
                ? await this.movieStatsReader!.getAdvancedMediaStats({ type: "platform" }, platformPreComputedStats.avgRated)
                : mediaType === MediaType.GAMES
                    ? await this.gameStatsReader!.getAdvancedMediaStats({ type: "platform" }, platformPreComputedStats.avgRated)
                    : mediaType === MediaType.BOOKS
                        ? await this.bookStatsReader!.getAdvancedMediaStats({ type: "platform" }, platformPreComputedStats.avgRated)
                        : await this.mangaStatsReader!.getAdvancedMediaStats({ type: "platform" }, platformPreComputedStats.avgRated);
        const activityByMonth = await this.userActivityService.getActivityStatsByMonth({ mediaType, excludeBulkImports: true });
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
