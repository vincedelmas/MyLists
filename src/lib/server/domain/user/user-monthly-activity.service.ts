import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaMonthlyActivityRegistry} from "@/lib/server/domain/media/media.registries";
import {MonthlyActivityMedia} from "@/lib/server/domain/media/base/base.monthly-activity";
import {calendarDateRangeToISOString, compareDateInputs} from "@/lib/utils/date-formatting";
import {UserMonthlyActivityRepository} from "@/lib/server/domain/user/user-monthly-activity.repository";
import {AddMonthlyActivity, MonthlyActivityFilters, MonthlyActivityStatsFilters, UpdateMonthlyActivity} from "@/lib/schemas";
import {LogMonthlyActivityFromDelta, MonthlyActivityChartDatum, MonthlyActivityEditor, MonthlyActivityMediaRef, WrappedMonthlyActivityResult} from "@/lib/types/activity.types";


export class UserMonthlyActivityService {
    constructor(
        private repository: typeof UserMonthlyActivityRepository,
        private mediaMonthlyActivityRegistry: MediaMonthlyActivityRegistry,
    ) {
    }

    async logActivityFromDelta({ userId, mediaType, mediaId, delta, updateType, activityDate }: LogMonthlyActivityFromDelta) {
        const contribution = this.mediaMonthlyActivityRegistry
            .get(mediaType)
            .createContribution(delta, updateType);

        await this.repository.addContribution({ ...contribution, userId, mediaId, mediaType, activityDate });
    }

    async getMonthlyActivityStats(userId: number, filters: MonthlyActivityStatsFilters) {
        const timeBucket = `${filters.year}-${zeroPad(filters.month)}`;
        const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);

        const activities = await this.repository.getMonthlyStatsContributions(userId, mediaTypes, timeBucket);
        const mediaDetailsByType = await this._getMediaByType(activities);

        const activityRecord = Object.fromEntries(mediaTypes.map((mediaType) => {
            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(mediaType);
            const contributions = activities.filter((activity) => activity.mediaType === mediaType);
            const mediaById = mediaDetailsByType.get(mediaType) ?? new Map();

            return [mediaType, monthlyActivity.summarize(contributions, mediaById)];
        })) as Record<MediaType, WrappedMonthlyActivityResult>;

        const mediaStats = mediaTypes
            .map((mediaType) => ({
                mediaType,
                count: activityRecord[mediaType].count,
                timeGained: activityRecord[mediaType].timeGained,
                progressTotal: activityRecord[mediaType].progressTotal,
            }))
            .filter((stat) => stat.timeGained > 0 || stat.progressTotal > 0)
            .sort((a, b) => b.timeGained - a.timeGained);

        return {
            mediaStats,
            mediaTypes: mediaStats.map((stat) => stat.mediaType),
            totalTime: mediaStats.reduce((total, stat) => total + stat.timeGained, 0),
        };
    }

    async getMonthlyActivity(userId: number, filters: MonthlyActivityFilters) {
        const timeBucket = `${filters.year}-${zeroPad(filters.month)}`;
        const mediaTypes = filters.activeTab === "all" ? Object.values(MediaType) : [filters.activeTab];

        const mediaIdsByType = filters.search?.trim()
            ? await this._searchActivityMediaIds(userId, mediaTypes, filters.search.trim())
            : undefined;

        const [availableMediaTypes, result] = await Promise.all([
            this.repository.getMonthlyMediaTypes(userId, timeBucket, filters.hiddenOnly),
            this.repository.getPaginatedMonthlyActivities(userId, {
                timeBucket,
                perPage: 48,
                mediaIdsByType,
                page: filters.page,
                hiddenOnly: filters.hiddenOnly,
                activityKind: filters.activityKind,
                mediaType: filters.activeTab === "all" ? undefined : filters.activeTab,
            }),
        ]);

        const mediaDetailsByType = await this._getMediaByType(result.items);

        const rows: MonthlyActivityEditor[] = [];
        for (const activity of result.items) {
            const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);
            if (!mediaDetails) continue;

            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(activity.mediaType);

            rows.push({
                id: activity.id,
                hidden: activity.hidden,
                mediaId: activity.mediaId,
                mediaName: mediaDetails.name,
                mediaType: activity.mediaType,
                redoGained: activity.redoGained,
                mediaCover: mediaDetails.imageCover,
                hadCompletion: activity.hadCompletion,
                lastActivityAt: activity.lastActivityAt,
                progressGained: activity.progressGained,
                timeGained: monthlyActivity.progressToMinutes(activity.progressGained, mediaDetails.duration),
            });
        }

        const items = rows.sort((a, b) => compareDateInputs(b.lastActivityAt, a.lastActivityAt));

        return { ...result, items, mediaTypes: availableMediaTypes };
    }

    async addMonthlyActivity(userId: number, payload: AddMonthlyActivity) {
        const monthlyActivity = this.mediaMonthlyActivityRegistry.get(payload.mediaType);
        const { mediaExists, inUserList } = await monthlyActivity.hasUserMedia(userId, payload.mediaId);

        if (!mediaExists) throw new FormattedError("Media not found");
        if (!inUserList) throw new FormattedError("Media not in your list");

        const { lastActivityAt, ...contribution } = payload;
        await this.repository.addContribution({ ...contribution, userId, activityDate: lastActivityAt });
    }

    async updateMonthlyActivity(userId: number, activityId: number, payload: UpdateMonthlyActivity) {
        return this.repository.updateMonthlyActivity(userId, activityId, payload);
    }

    async removeFromMonth(userId: number, activityId: number) {
        await this.repository.removeFromMonth(userId, activityId);
    }

    async bulkHideMonthlyActivity(userId: number, filters: { startDate: string, endDate: string, mediaType?: MediaType }) {
        const range = calendarDateRangeToISOString(filters.startDate, filters.endDate);
        if (!range) throw new FormattedError("Invalid activity cleanup date range");

        return this.repository.bulkHideMonthlyActivity(userId, {
            endDate: range.endDate,
            startDate: range.startDate,
            mediaType: filters.mediaType,
        });
    }

    async deleteAssociatedActivities(userId: number, mediaType: MediaType, mediaId: number) {
        await this.repository.deleteAssociatedActivities(userId, mediaType, mediaId);
    }

    async getActivityStatsByMonth(filters: { userId?: number, mediaType?: MediaType, startYear?: number, excludeBulkImports?: boolean } = {}) {
        const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);
        const activities = await this.repository.getProgressStatsByMonth({
            userId: filters.userId,
            mediaType: filters.mediaType,
            startMonth: `${filters.startYear ?? 2026}-01`,
            excludeBulkImports: filters.excludeBulkImports,
        });

        const chartMap = new Map<string, MonthlyActivityChartDatum>();
        const mediaDetailsByType = await this._getMediaByType(activities);

        for (const activity of activities) {
            const monthData = chartMap.get(activity.monthBucket) ?? {
                total: 0,
                month: activity.monthBucket,
                ...Object.fromEntries(mediaTypes.map((mediaType) => [mediaType, 0])),
            } as MonthlyActivityChartDatum;

            const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);
            if (!mediaDetails) continue;

            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(activity.mediaType);
            const timeGained = monthlyActivity.progressToMinutes(activity.progressGained, mediaDetails.duration) / 60;

            monthData.total += timeGained;
            monthData[activity.mediaType] = (monthData[activity.mediaType] ?? 0) + timeGained;

            chartMap.set(activity.monthBucket, monthData);
        }

        const sortedData = [...chartMap.values()].sort((a, b) => a.month.localeCompare(b.month));
        const lastMonth = sortedData.at(-1)?.month ?? `${filters.startYear ?? 2026}-01`;
        const endDate = new Date(`${lastMonth}-01T00:00:00.000Z`);
        const currentDate = new Date(`${filters.startYear ?? 2026}-01-01T00:00:00.000Z`);
        const byMonth = new Map(sortedData.map((entry) => [entry.month, entry]));
        const result: MonthlyActivityChartDatum[] = [];

        while (currentDate <= endDate) {
            const month = `${currentDate.getUTCFullYear()}-${zeroPad(currentDate.getUTCMonth() + 1)}`;
            result.push(byMonth.get(month) ?? ({ month, total: 0 } as MonthlyActivityChartDatum));
            currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
        }

        return { mediaTypes, data: result };
    }

    private async _getMediaByType(activities: MonthlyActivityMediaRef[]) {
        const mediaTypes = [...new Set(activities.map((activity) => activity.mediaType))];
        const mediaDetailsByType = new Map<MediaType, Map<number, MonthlyActivityMedia>>();

        await Promise.all(mediaTypes.map(async (mediaType) => {
            const mediaIds = activities
                .filter((activity) => activity.mediaType === mediaType)
                .map((activity) => activity.mediaId);

            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(mediaType);
            const mediaDetails = await monthlyActivity.getMediaByIds(mediaIds);
            mediaDetailsByType.set(mediaType, new Map(mediaDetails.map((media) => [media.id, media])));
        }));

        return mediaDetailsByType;
    }

    private async _searchActivityMediaIds(userId: number, mediaTypes: MediaType[], search: string) {
        const entries = await Promise.all(mediaTypes.map(async (mediaType) => {
            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(mediaType);
            const results = await monthlyActivity.searchUserMedia(userId, search, 20);

            return [mediaType, results.map((result) => result.mediaId)] as const;
        }));

        return Object.fromEntries(entries) as Partial<Record<MediaType, number[]>>;
    }
}
