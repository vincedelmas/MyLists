import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {FormattedError} from "@/lib/utils/error-classes";
import {calculateActivityTime} from "@/lib/utils/activity-utils";
import {LibraryAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {ActivityRepository} from "@/lib/server/domain/activity/activity.repository";
import {calendarDateRangeToISOString, compareDateInputs} from "@/lib/utils/date-formatting";
import {AddActivity, MonthlyActivityFilters, MonthlyActivityStatsFilters, UpdateActivity} from "@/lib/schemas";
import {ActivityEditor as ActivityEditorRow, ActivityMediaRef, MediaInfo, MonthlyActivityChartDatum, WrappedActivityResult} from "@/lib/types/activity.types";


export class ActivityService {
    private readonly repository = ActivityRepository;

    async getMonthlyActivityStats(filters: MonthlyActivityStatsFilters, access?: LibraryAccessScope) {
        const timeBucket = `${filters.year}-${zeroPad(filters.month)}`;
        const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);
        if (!access) throw new FormattedError("Activity access scope is required");
        const activities = await this.repository.getStatsActivities(access, mediaTypes, timeBucket);
        const mediaDetailsByType = await this._getMediaDurationsByType(activities);

        const activityRecord = Object.fromEntries(
            mediaTypes.map((mediaType) =>
                [mediaType, { count: 0, timeGained: 0, specificTotal: 0 }])
        ) as Record<MediaType, WrappedActivityResult>;

        for (const entry of activities) {
            const mediaDetails = mediaDetailsByType.get(entry.mediaType)?.get(entry.mediaId);
            if (!mediaDetails) continue;

            const timeGained = calculateActivityTime(entry.mediaType, entry.specificGained, mediaDetails.duration ?? undefined);
            const aggStats = activityRecord[entry.mediaType];

            aggStats.count += 1;
            aggStats.timeGained += timeGained;
            aggStats.specificTotal += entry.specificGained;
        }

        const mediaStats = mediaTypes
            .map((mt) => ({
                mediaType: mt,
                count: activityRecord[mt].count,
                timeGained: activityRecord[mt].timeGained,
                specificTotal: activityRecord[mt].specificTotal,
            }))
            .filter((stat) => stat.timeGained > 0 || stat.specificTotal > 0)
            .sort((a, b) => b.timeGained - a.timeGained);

        return {
            mediaStats,
            mediaTypes: mediaStats.map((stat) => stat.mediaType),
            totalTime: mediaStats.reduce((total, stat) => total + stat.timeGained, 0),
        };
    }

    async getMonthlyActivity(userId: number, filters: MonthlyActivityFilters, access?: LibraryAccessScope) {
        const timeBucket = `${filters.year}-${zeroPad(filters.month)}`;
        const mediaTypes = filters.activeTab === "all" ? Object.values(MediaType) : [filters.activeTab];

        const mediaIdsByType = filters.search?.trim()
            ? await this._searchActivityMediaIds(userId, mediaTypes, filters.search.trim())
            : undefined;
        if (!access) throw new FormattedError("Activity access scope is required");
        const [availableMediaTypes, result] = await Promise.all([
            this.repository.getActivityMediaTypes(access, timeBucket, filters.hiddenOnly),
            this.repository.getPaginatedActivities(access, {
                timeBucket,
                perPage: 48,
                mediaIdsByType,
                page: filters.page,
                hiddenOnly: filters.hiddenOnly,
                activityKind: filters.activityKind,
                mediaType: filters.activeTab === "all" ? undefined : filters.activeTab,
            }),
        ]);

        const mediaDetailsByType = await this._getMediaDetailsByType(result.items);

        const rows: ActivityEditorRow[] = [];
        for (const activity of result.items) {
            const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);
            if (!mediaDetails) continue;

            rows.push({
                id: activity.id,
                hidden: activity.hidden,
                isRedo: activity.isRedo,
                mediaId: activity.mediaId,
                mediaName: mediaDetails.name,
                mediaType: activity.mediaType,
                lastUpdate: activity.lastUpdate,
                isCompleted: activity.isCompleted,
                mediaCover: mediaDetails.imageCover,
                specificGained: activity.specificGained,
                timeGained: calculateActivityTime(activity.mediaType, activity.specificGained, mediaDetails.duration),
            });
        }

        const items = rows.sort((a, b) => compareDateInputs(b.lastUpdate, a.lastUpdate));

        return { ...result, items, mediaTypes: availableMediaTypes };
    }

    async addActivity(userId: number, payload: AddActivity) {
        await this.repository.addActivity(userId, payload);
    }

    async updateActivity(userId: number, activityId: number, payload: UpdateActivity) {
        return this.repository.updateActivity(userId, activityId, payload);
    }

    async deleteActivity(userId: number, activityId: number) {
        await this.repository.deleteActivity(userId, activityId);
    }

    async bulkHideActivity(userId: number, filters: { startDate: string, endDate: string, mediaType?: MediaType }) {
        const range = calendarDateRangeToISOString(filters.startDate, filters.endDate);
        if (!range) throw new FormattedError("Invalid activity cleanup date range");

        return this.repository.bulkHideActivity(userId, {
            endDate: range.endDate,
            mediaType: filters.mediaType,
            startDate: range.startDate,
        });
    }

    async getActivityStatsByMonth(filters: { userId?: number, mediaType?: MediaType, startYear?: number, excludeBulkImports?: boolean } = {}) {
        const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);
        const startMonth = `${filters.startYear ?? 2026}-01`;
        const activities = await this.repository.getActivityStatsByMonth({
            userId: filters.userId,
            mediaType: filters.mediaType,
            startMonth,
            excludeBulkImports: filters.excludeBulkImports,
        });

        const chartMap = new Map<string, MonthlyActivityChartDatum>();
        const mediaDetailsByType = await this._getMediaDurationsByType(activities);

        for (const activity of activities) {
            const monthData = chartMap.get(activity.monthBucket) ?? {
                total: 0,
                month: activity.monthBucket,
                ...Object.fromEntries(mediaTypes.map((mt) => [mt, 0])),
            } as MonthlyActivityChartDatum;

            const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);
            if (!mediaDetails) continue;

            const timeGained = calculateActivityTime(activity.mediaType, activity.specificGained, mediaDetails.duration ?? undefined) / 60;

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

    private async _getMediaDetailsByType(activities: ActivityMediaRef[]) {
        const mediaTypes = [...new Set(activities.map((activity) => activity.mediaType))];
        const mediaDetailsByType = new Map<MediaType, Map<number, MediaInfo>>();

        await Promise.all(mediaTypes.map(async (mediaType) => {
            const mediaIds = activities
                .filter((activity) => activity.mediaType === mediaType)
                .map((activity) => activity.mediaId);

            if (mediaIds.length === 0) {
                mediaDetailsByType.set(mediaType, new Map());
                return;
            }

            const mediaDetails = await this.repository.getMediaDetailsByIds(mediaType, mediaIds);
            mediaDetailsByType.set(mediaType, new Map(mediaDetails.map((m) => [m.id, m])));
        }));

        return mediaDetailsByType;
    }

    private async _getMediaDurationsByType(activities: ActivityMediaRef[]) {
        const mediaTypes = [...new Set(activities.map((activity) => activity.mediaType))];
        const durationsByType = new Map<MediaType, Map<number, { id: number; duration: number | null }>>();

        await Promise.all(mediaTypes.map(async (mediaType) => {
            const mediaIds = activities
                .filter((activity) => activity.mediaType === mediaType)
                .map((activity) => activity.mediaId);

            const durations = await this.repository.getMediaDurationsByIds(mediaType, mediaIds);
            durationsByType.set(mediaType, new Map(durations.map((media) => [media.id, media])));
        }));

        return durationsByType;
    }

    private async _searchActivityMediaIds(userId: number, mediaTypes: MediaType[], search: string) {
        const entries = await Promise.all(mediaTypes.map(async (mediaType) => {
            const results = await this.repository.searchUserListByName(userId, mediaType, search, 20);

            return [mediaType, results.map((result) => result.mediaId)] as const;
        }));

        return Object.fromEntries(entries) as Partial<Record<MediaType, number[]>>;
    }
}
