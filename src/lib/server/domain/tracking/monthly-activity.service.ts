import {MediaType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getActivityMonthRange} from "@/lib/utils/activity-utils";
import {fillMonthlyActivityTimeline} from "@/lib/utils/stats-utils";
import type {MediaMonthlyActivityRegistry} from "@/lib/server/domain/media/media.registries";
import {calendarDateRangeToISOString, compareDateInputs} from "@/lib/utils/date-formatting";
import {resolveMonthlyActivityMedia} from "@/lib/server/domain/media/base/base.monthly-activity";
import type {MonthlyActivityRepository} from "@/lib/server/domain/tracking/monthly-activity.repository";
import {AddMonthlyActivity, MonthlyActivityFilters, MonthlyActivityStatsFilters, UpdateMonthlyActivity} from "@/lib/schemas";
import {LogMonthlyActivityFromDelta, MonthlyActivityChartDatum, MonthlyActivityEditor, MonthlyActivityOccurrence, WrappedMonthlyActivityResult} from "@/lib/types/activity.types";


export const createMonthlyActivityService = (repository: MonthlyActivityRepository, mediaMonthlyActivityRegistry: MediaMonthlyActivityRegistry) => {
    const searchActivityMediaIds = async (userId: number, mediaTypes: MediaType[], search: string) => {
        const entries = await Promise.all(mediaTypes.map(async (mediaType) => {
            const monthlyActivity = mediaMonthlyActivityRegistry.get(mediaType);
            const results = await monthlyActivity.searchUserMedia(userId, search, 20);

            return [mediaType, results.map((result) => result.mediaId)] as const;
        }));

        return Object.fromEntries(entries) as Partial<Record<MediaType, number[]>>;
    };

    return {
        async logActivityFromDelta({ userId, mediaType, mediaId, delta, updateType, activityDate }: LogMonthlyActivityFromDelta) {
            const contribution = mediaMonthlyActivityRegistry.get(mediaType).createContribution(delta, updateType);
            await repository.addContribution({ ...contribution, userId, mediaId, mediaType, activityDate });
        },

        async getMonthlyActivityStats(userId: number, filters: MonthlyActivityStatsFilters) {
            const range = getActivityMonthRange(filters.year, filters.month, filters.view);
            const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);

            const activities = await repository.getMonthlyStatsContributions(userId, mediaTypes, range.startMonth, range.endMonth);
            const mediaDetailsByType = await resolveMonthlyActivityMedia(activities, mediaMonthlyActivityRegistry);

            const activityRecord = Object.fromEntries(mediaTypes.map((mediaType) => {
                const monthlyActivity = mediaMonthlyActivityRegistry.get(mediaType);
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
        },

        async getMonthlyActivity(userId: number, filters: MonthlyActivityFilters, canViewHidden = false) {
            if (filters.hiddenOnly && !canViewHidden) {
                throw new FormattedError("Hidden activity is only available to the profile owner");
            }

            const range = getActivityMonthRange(filters.year, filters.month, filters.view);
            const mediaTypes = filters.activeTab === "all" ? Object.values(MediaType) : [filters.activeTab];

            const mediaIdsByType = filters.search?.trim()
                ? await searchActivityMediaIds(userId, mediaTypes, filters.search.trim())
                : undefined;

            const [availableMediaTypes, result] = await Promise.all([
                repository.getMonthlyMediaTypes(userId, range.startMonth, range.endMonth, filters.hiddenOnly),
                repository[filters.view === "year" ? "getPaginatedYearlyActivities" : "getPaginatedMonthlyActivities"](userId, {
                    ...range,
                    perPage: 48,
                    mediaIdsByType,
                    page: filters.page,
                    hiddenOnly: filters.hiddenOnly,
                    activityKind: filters.activityKind,
                    mediaType: filters.activeTab === "all" ? undefined : filters.activeTab,
                }),
            ]);

            const mediaDetailsByType = await resolveMonthlyActivityMedia(result.items, mediaMonthlyActivityRegistry);

            const rows: MonthlyActivityEditor[] = [];
            for (const activity of result.items) {
                const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);
                if (!mediaDetails) continue;

                const monthlyActivity = mediaMonthlyActivityRegistry.get(activity.mediaType);
                const storedOccurrences = "occurrences" in activity
                    ? activity.occurrences as Omit<MonthlyActivityOccurrence, "timeGained">[]
                    : undefined;
                const occurrences = storedOccurrences
                    ? storedOccurrences.map((occurrence) => ({
                        id: occurrence.id,
                        hidden: occurrence.hidden,
                        monthBucket: occurrence.monthBucket,
                        redoGained: occurrence.redoGained,
                        hadCompletion: occurrence.hadCompletion,
                        lastActivityAt: occurrence.lastActivityAt,
                        progressGained: occurrence.progressGained,
                        timeGained: monthlyActivity.progressToMinutes(occurrence.progressGained, mediaDetails.duration),
                    }))
                    : undefined;

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
                    occurrences,
                });
            }

            const items = rows.sort((a, b) => compareDateInputs(b.lastActivityAt, a.lastActivityAt));

            return { ...result, items, mediaTypes: availableMediaTypes };
        },

        async addMonthlyActivity(userId: number, payload: AddMonthlyActivity) {
            const monthlyActivity = mediaMonthlyActivityRegistry.get(payload.mediaType);
            const { mediaExists, inUserList } = await monthlyActivity.hasUserMedia(userId, payload.mediaId);

            if (!mediaExists) throw new FormattedError("Media not found");
            if (!inUserList) throw new FormattedError("Media not in your list");

            const { lastActivityAt, ...contribution } = payload;
            await repository.addContribution({ ...contribution, userId, activityDate: lastActivityAt });
        },

        async updateMonthlyActivity(userId: number, activityId: number, payload: UpdateMonthlyActivity) {
            return repository.updateMonthlyActivity(userId, activityId, payload);
        },

        async removeFromMonth(userId: number, activityId: number) {
            await repository.removeFromMonth(userId, activityId);
        },

        async bulkHideMonthlyActivity(userId: number, filters: { startDate: string, endDate: string, mediaType?: MediaType }) {
            const range = calendarDateRangeToISOString(filters.startDate, filters.endDate);
            if (!range) throw new FormattedError("Invalid activity cleanup date range");

            return repository.bulkHideMonthlyActivity(userId, {
                endDate: range.endDate,
                startDate: range.startDate,
                mediaType: filters.mediaType,
            });
        },

        async deleteAssociatedActivities(userId: number, mediaType: MediaType, mediaId: number) {
            await repository.deleteAssociatedActivities(userId, mediaType, mediaId);
        },

        async getActivityStatsByMonth(filters: { userId?: number, mediaType?: MediaType, startYear?: number, excludeBulkImports?: boolean } = {}) {
            const now = new Date();
            const currentYear = now.getUTCFullYear();

            const selectedYear = filters.startYear ?? currentYear;
            const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);

            const endMonth = `${selectedYear}-12`;
            const startMonth = `${selectedYear}-01`;

            const activities = await repository.getProgressStatsByMonth({
                endMonth,
                startMonth,
                userId: filters.userId,
                mediaType: filters.mediaType,
                excludeBulkImports: filters.excludeBulkImports,
            });

            const chartMap = new Map<string, MonthlyActivityChartDatum>();
            const mediaDetailsByType = await resolveMonthlyActivityMedia(activities, mediaMonthlyActivityRegistry);

            for (const activity of activities) {
                const monthData = chartMap.get(activity.monthBucket) ?? {
                    total: 0,
                    month: activity.monthBucket,
                    ...Object.fromEntries(mediaTypes.map((mediaType) => [mediaType, 0])),
                } as MonthlyActivityChartDatum;

                const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);
                if (!mediaDetails) continue;

                const monthlyActivity = mediaMonthlyActivityRegistry.get(activity.mediaType);
                const timeGained = monthlyActivity.progressToMinutes(activity.progressGained, mediaDetails.duration) / 60;

                monthData.total += timeGained;
                monthData[activity.mediaType] = (monthData[activity.mediaType] ?? 0) + timeGained;

                chartMap.set(activity.monthBucket, monthData);
            }

            const sortedData = [...chartMap.values()].sort((a, b) => a.month.localeCompare(b.month));
            const result = fillMonthlyActivityTimeline({ data: sortedData, endMonth, mediaTypes, startMonth });

            return {
                mediaTypes,
                data: result,
                range: { startMonth, endMonth },
            };
        },
    };
};


export type MonthlyActivityService = ReturnType<typeof createMonthlyActivityService>;
