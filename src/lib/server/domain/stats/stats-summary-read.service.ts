import {Status} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {StatsSummaryRepository} from "@/lib/server/domain/stats/stats-summary.repository";


type StatsSummarySource = Awaited<ReturnType<typeof StatsSummaryRepository.getPreComputedStatsSummary>>;


const formatStatsSummary = (source: StatsSummarySource, userId?: number) => {
    const {
        totalHours,
        totalEntries,
        totalFavorites,
        totalComments,
        totalRedo,
        totalRated,
        sumOfAllRatings,
        distinctMediaTypes,
    } = source.preComputedStats;
    const excludedStatuses = statusUtils.getNoPlanTo();
    const totalEntriesNoPlan = source.statusCountsList.reduce((sum, setting) => {
        const settingSum = Object.entries(setting.statusCounts).reduce((total, [status, value]) =>
            excludedStatuses.includes(status as Status) ? total : total + value, 0);
        return sum + settingSum;
    }, 0);
    const avgDivisor = userId !== undefined ? distinctMediaTypes : source.totalUsers;

    return {
        avgRated: totalRated === 0 ? null : sumOfAllRatings / totalRated,
        totalRedo,
        totalRated,
        avgComments: avgDivisor === 0 ? null : totalComments / avgDivisor,
        percentRated: totalEntriesNoPlan === 0 ? null : (totalRated / totalEntriesNoPlan) * 100,
        avgFavorites: avgDivisor === 0 ? null : totalFavorites / avgDivisor,
        totalEntries,
        totalComments,
        totalFavorites,
        totalEntriesNoPlan,
        mediaTimeDistribution: source.mediaTimeDistribution,
        totalHours,
        totalDays: totalHours / 24,
        mediaTypes: source.mediaTimeDistribution.map(({ name }) => name),
        ...(userId !== undefined ? {} : { totalUsers: source.totalUsers }),
    };
};


export class StatsSummaryReadService {
    constructor(private readonly repository = StatsSummaryRepository) {}

    async getSummary(userId?: number) {
        return formatStatsSummary(await this.repository.getPreComputedStatsSummary({ userId }), userId);
    }

    async getPerMediaSummary(userId: number) {
        const settings = await this.repository.getActiveMediaSettings(userId);
        const excludedStatuses = statusUtils.getNoPlanTo();
        return settings.map((setting) => {
            const totalNoPlan = Object.entries(setting.statusCounts).reduce((sum, [status, value]) =>
                excludedStatuses.includes(status as Status) ? sum : sum + value, 0);
            return {
                statusList: Object.entries(setting.statusCounts).map(([status, count]) => ({
                    status: status as Status,
                    count,
                    percent: (count / setting.totalEntries) * 100,
                })),
                totalNoPlan,
                mediaType: setting.mediaType,
                avgRated: setting.averageRating,
                timeSpent: setting.timeSpent / 60,
                noData: setting.totalEntries === 0,
                totalEntries: setting.totalEntries,
                entriesRated: setting.entriesRated,
                totalSpecific: setting.totalSpecific,
                timeSpentDays: setting.timeSpent / 1440,
                entriesFavorites: setting.entriesFavorites,
                percentRated: setting.entriesRated === 0 ? null : (setting.entriesRated / totalNoPlan) * 100,
            };
        });
    }
}
