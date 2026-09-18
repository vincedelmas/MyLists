import {createHash} from "node:crypto";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {withTransaction} from "@/lib/server/database/async-storage";
import {MediaMonthlyActivityRegistry} from "@/lib/server/domain/media/media.registries";
import {fillMonthlyActivityTimeline} from "@/lib/server/domain/tracking/activity-timeline";
import {allocateActivityCorrection, getActivityMonthRange} from "@/lib/utils/media/activity";
import {resolveMonthlyActivityMedia} from "@/lib/server/domain/media/base/base.monthly-activity";
import {MonthlyActivityRepository} from "@/lib/server/domain/tracking/monthly-activity.repository";
import {calendarDateRangeToISOString, compareDateInputs, monthBucketFromDateInput} from "@/lib/utils/formatting/date";
import {AddMonthlyActivity, MonthlyActivityFilters, MonthlyActivityStatsFilters, UpdateMonthlyActivity} from "@/lib/schemas";
import {
    ActivityCorrectionChoice,
    ActivityCorrectionPreview,
    LogMonthlyActivityFromDelta,
    MonthlyActivityChartDatum,
    MonthlyActivityEditor,
    MonthlyActivityOccurrence,
    WrappedMonthlyActivityResult
} from "@/lib/types/activity.types";


export class ActivityCorrectionRequired extends Error {
    constructor(public readonly preview: ActivityCorrectionPreview) {
        super("Review the monthly activity correction before saving.");
    }
}


export class MonthlyActivityService {
    constructor(
        private repository: typeof MonthlyActivityRepository,
        private mediaMonthlyActivityRegistry: MediaMonthlyActivityRegistry,
    ) {
    }

    logActivityFromDelta({ userId, mediaType, mediaId, delta, updateType, activityDate }: LogMonthlyActivityFromDelta) {
        const contribution = this.mediaMonthlyActivityRegistry.get(mediaType).createContribution(delta, updateType);
        this.repository.addContribution({ ...contribution, userId, mediaId, mediaType, activityDate });
    }

    correctActivityFromDelta({ userId, mediaType, mediaId, delta, updateType, activityDate }: LogMonthlyActivityFromDelta, choice?: ActivityCorrectionChoice) {
        // Status resets change current position without undoing past consumption.
        if (updateType === UpdateType.STATUS) return null;

        const progressRemoved = Math.max(0, -this.mediaMonthlyActivityRegistry.get(mediaType).progressFromDelta(delta));
        const redoRemoved = updateType === UpdateType.REDO ? Math.max(0, -(delta.totalRedo ?? 0)) : 0;

        if (progressRemoved === 0 && redoRemoved === 0) {
            if (choice) throw new FormattedError("Your progress changed while reviewing this correction. Please reload and try again.");
            return null;
        }

        const currentMonth = monthBucketFromDateInput(new Date());
        const activityMonth = activityDate ? monthBucketFromDateInput(activityDate) : currentMonth;
        const months = this.repository.getCorrectionMonths(userId, mediaType, mediaId, activityMonth);

        const version = createHash("sha256")
            .update(JSON.stringify({ userId, mediaType, mediaId, activityMonth, progressRemoved, redoRemoved, months }))
            .digest("hex");

        const preview = { version, progressRemoved, redoRemoved, months };

        // Recheck exact preview inside update transaction, including manual edits made meanwhile.
        if (choice && choice.version !== version) {
            throw new ActivityCorrectionRequired(preview);
        }

        if (choice?.startMonth && !months.some(month => month.monthBucket === choice.startMonth)) {
            throw new FormattedError("The selected activity month is no longer available.");
        }

        if (choice?.keepHistory) {
            return {
                changes: [],
                keptHistory: true,
                unrecordedRedo: 0,
                unrecordedProgress: 0,
            };
        }

        const allocation = allocateActivityCorrection(preview, choice?.startMonth);
        if (!choice && (allocation.unrecordedProgress > 0 || allocation.unrecordedRedo > 0 || allocation.changes.some(change => change.monthBucket !== currentMonth))) {
            throw new ActivityCorrectionRequired(preview);
        }

        this.repository.applyCorrection(userId, allocation.changes);

        return { ...allocation, keptHistory: false };
    }

    async getMonthlyActivityStats(userId: number, filters: MonthlyActivityStatsFilters) {
        const range = getActivityMonthRange(filters.year, filters.month, filters.view);
        const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);

        const activities = await this.repository.getMonthlyStatsContributions(userId, mediaTypes, range.startMonth, range.endMonth);
        const mediaDetailsByType = await resolveMonthlyActivityMedia(activities, this.mediaMonthlyActivityRegistry);

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

    async getMonthlyActivity(userId: number, filters: MonthlyActivityFilters, canViewHidden = false) {
        if (filters.hiddenOnly && !canViewHidden) {
            throw new FormattedError("Hidden activity is only available to the profile owner");
        }

        const range = getActivityMonthRange(filters.year, filters.month, filters.view);

        const [availableMediaTypes, result] = await Promise.all([
            this.repository.getMonthlyMediaTypes(userId, range.startMonth, range.endMonth, filters.hiddenOnly),
            this.repository[filters.view === "year" ? "getPaginatedYearlyActivities" : "getPaginatedMonthlyActivities"](userId, {
                ...range,
                perPage: 48,
                page: filters.page,
                search: filters.search,
                hiddenOnly: filters.hiddenOnly,
                activityKind: filters.activityKind,
                mediaType: filters.activeTab === "all" ? undefined : filters.activeTab,
            }),
        ]);

        const mediaDetailsByType = await resolveMonthlyActivityMedia(result.items, this.mediaMonthlyActivityRegistry);

        const rows: MonthlyActivityEditor[] = [];
        for (const activity of result.items) {
            const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);
            if (!mediaDetails) continue;

            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(activity.mediaType);
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
    }

    addMonthlyActivity(userId: number, payload: AddMonthlyActivity) {
        return withTransaction(() => {
            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(payload.mediaType);
            const { mediaExists, inUserList } = monthlyActivity.hasUserMedia(userId, payload.mediaId);

            if (!mediaExists) throw new FormattedError("Media not found");
            if (!inUserList) throw new FormattedError("Media not in your list");

            const { lastActivityAt, ...contribution } = payload;
            this.repository.addContribution({ ...contribution, userId, activityDate: lastActivityAt });
        });
    }

    updateMonthlyActivity(userId: number, activityId: number, payload: UpdateMonthlyActivity) {
        return withTransaction(() => {
            return this.repository.updateMonthlyActivity(userId, activityId, payload);
        });
    }

    removeFromMonth(userId: number, activityId: number) {
        return withTransaction(() => {
            this.repository.removeFromMonth(userId, activityId);
        });
    }

    bulkHideMonthlyActivity(userId: number, filters: { startDate: string, endDate: string, mediaType?: MediaType }) {
        return withTransaction(() => {
            const range = calendarDateRangeToISOString(filters.startDate, filters.endDate);
            if (!range) throw new FormattedError("Invalid activity cleanup date range");

            return this.repository.bulkHideMonthlyActivity(userId, {
                endDate: range.endDate,
                startDate: range.startDate,
                mediaType: filters.mediaType,
            });
        });
    }

    deleteAssociatedActivities(userId: number, mediaType: MediaType, mediaId: number) {
        this.repository.deleteAssociatedActivities(userId, mediaType, mediaId);
    }

    async getActivityStatsByMonth(filters: { userId?: number, mediaType?: MediaType, startYear?: number, excludeBulkImports?: boolean } = {}) {
        const now = new Date();
        const currentYear = now.getUTCFullYear();

        const selectedYear = filters.startYear ?? currentYear;
        const mediaTypes = filters.mediaType ? [filters.mediaType] : Object.values(MediaType);

        const endMonth = `${selectedYear}-12`;
        const startMonth = `${selectedYear}-01`;

        const activities = await this.repository.getProgressStatsByMonth({
            endMonth,
            startMonth,
            userId: filters.userId,
            mediaType: filters.mediaType,
            excludeBulkImports: filters.excludeBulkImports,
        });

        const chartMap = new Map<string, MonthlyActivityChartDatum>();
        const mediaDetailsByType = await resolveMonthlyActivityMedia(activities, this.mediaMonthlyActivityRegistry);

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
        const result = fillMonthlyActivityTimeline({ data: sortedData, endMonth, mediaTypes, startMonth });

        return {
            mediaTypes,
            data: result,
            range: { startMonth, endMonth },
        };
    }
}
