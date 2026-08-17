import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {FormattedError} from "@/lib/utils/error-classes";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaMonthlyActivityRegistry} from "@/lib/server/domain/media/media.registries";
import {resolveMonthlyActivityMedia} from "@/lib/server/domain/media/base/base.monthly-activity";
import {UserMonthlyActivityRepository} from "@/lib/server/domain/user/user-monthly-activity.repository";
import {YearRecapData, YearRecapMediaSummary, YearRecapMonth, YearRecapTitle} from "@/lib/types/year-recap.types";


type YearRecapOptions = {
    isAvailable: boolean;
    mediaType?: MediaType;
};


export class YearRecapService {
    constructor(
        private repository: typeof UserMonthlyActivityRepository,
        private mediaMonthlyActivityRegistry: MediaMonthlyActivityRegistry,
    ) {
    }

    async getYearRecap(userId: number, year: number, { mediaType, isAvailable }: YearRecapOptions): Promise<YearRecapData> {
        if (!isAvailable) {
            throw new FormattedError(`${year} recap is not available yet`);
        }

        const [activities, availableMediaTypes] = await Promise.all([
            this.repository.getYearRecapActivities(userId, year, mediaType),
            this.repository.getYearRecapMediaTypes(userId, year),
        ]);

        const mediaDetailsByType = await resolveMonthlyActivityMedia(activities, this.mediaMonthlyActivityRegistry, userId);
        const monthRecords = new Map<string, YearRecapMonth & { titleIds: Set<string> }>();

        for (let month = 1; month <= 12; month++) {
            const monthBucket = `${year}-${zeroPad(month)}`;
            monthRecords.set(monthBucket, {
                hours: 0,
                repeats: 0,
                titleCount: 0,
                completions: 0,
                month: monthBucket,
                titleIds: new Set(),
            });
        }

        const titleRecords = new Map<string, YearRecapTitle & { monthIds: Set<string> }>();
        const mediaRecords = new Map<MediaType, Omit<YearRecapMediaSummary, "share"> & {
            monthIds: Set<string>;
            titleIds: Set<string>;
        }>();

        for (const activity of activities) {
            const definition = getMediaDefinition(activity.mediaType);
            const monthlyActivity = this.mediaMonthlyActivityRegistry.get(activity.mediaType);
            const mediaDetails = mediaDetailsByType.get(activity.mediaType)?.get(activity.mediaId);

            const titleId = `${activity.mediaType}:${activity.mediaId}`;
            const hours = monthlyActivity.progressToMinutes(activity.progressGained, mediaDetails?.duration) / 60;
            const progress = definition.progress.timing.kind === "stored-minutes"
                ? activity.progressGained / definition.progress.timing.minutesPerInputUnit
                : activity.progressGained;

            const completions = activity.hadCompletion ? 1 : 0;
            const month = monthRecords.get(activity.monthBucket);

            if (month) {
                month.hours += hours;
                month.titleIds.add(titleId);
                month.completions += completions;
                month.repeats += activity.redoGained;
            }

            const title = titleRecords.get(titleId) ?? {
                hours: 0,
                repeats: 0,
                progress: 0,
                completions: 0,
                activeMonths: 0,
                mediaId: activity.mediaId,
                monthIds: new Set<string>(),
                mediaType: activity.mediaType,
                rating: mediaDetails?.rating ?? null,
                favorite: mediaDetails?.favorite === true,
                imageCover: mediaDetails?.imageCover ?? "",
                progressUnit: definition.progress.unit.plural,
                releaseDate: mediaDetails?.releaseDate ?? null,
                name: mediaDetails?.name ?? `Unknown ${definition.terminology.entry.singular}`,
            };

            title.hours += hours;
            title.progress += progress;
            title.completions += completions;
            title.repeats += activity.redoGained;
            title.monthIds.add(activity.monthBucket);
            titleRecords.set(titleId, title);

            const media = mediaRecords.get(activity.mediaType) ?? {
                hours: 0,
                repeats: 0,
                progress: 0,
                titleCount: 0,
                completions: 0,
                activeMonths: 0,
                monthIds: new Set<string>(),
                titleIds: new Set<string>(),
                mediaType: activity.mediaType,
                progressUnit: definition.progress.unit.plural,
            };

            media.hours += hours;
            media.progress += progress;
            media.titleIds.add(titleId);
            media.completions += completions;
            media.repeats += activity.redoGained;
            media.monthIds.add(activity.monthBucket);
            mediaRecords.set(activity.mediaType, media);
        }

        const months = [...monthRecords.values()].map(({ titleIds, ...month }) => ({
            ...month,
            titleCount: titleIds.size,
        }));
        const totalHours = months.reduce((sum, month) => sum + month.hours, 0);

        const media = [...mediaRecords.values()]
            .map(({ monthIds, titleIds, ...summary }) => ({
                ...summary,
                titleCount: titleIds.size,
                activeMonths: monthIds.size,
                share: totalHours > 0 ? (summary.hours / totalHours) * 100 : 0,
            })).sort((left, right) => right.hours - left.hours);

        const rankedTitles = [...titleRecords.values()]
            .map(({ monthIds, ...title }) => ({ ...title, activeMonths: monthIds.size }))
            .sort((left, right) => {
                const leftIsRepeatOnly = left.repeats > 0 && left.completions === 0;
                const rightIsRepeatOnly = right.repeats > 0 && right.completions === 0;

                return Number(leftIsRepeatOnly) - Number(rightIsRepeatOnly)
                    || Number(right.favorite) - Number(left.favorite)
                    || (right.rating ?? -1) - (left.rating ?? -1)
                    || right.hours - left.hours
                    || right.progress - left.progress
                    || left.name.localeCompare(right.name);
            });

        let currentStreak = 0;
        let longestActiveStreak = 0;
        for (const month of months) {
            if (month.titleCount > 0) {
                currentStreak += 1;
                longestActiveStreak = Math.max(longestActiveStreak, currentStreak);
            }
            else {
                currentStreak = 0;
            }
        }

        const busiestMonth = [...months]
            .filter((month) => month.titleCount > 0)
            .sort((left, right) => right.hours - left.hours || right.titleCount - left.titleCount)[0] ?? null;

        const mostRepeatedTitle = [...rankedTitles]
            .filter((title) => title.repeats > 0)
            .sort((left, right) => right.repeats - left.repeats || right.hours - left.hours)[0] ?? null;

        const comparisonDefinition = mediaType ? getMediaDefinition(mediaType).statistics.timeComparison : null;

        return {
            year,
            media,
            months,
            busiestMonth,
            mostRepeatedTitle,
            availableMediaTypes,
            scope: mediaType ?? "all",
            topTitles: rankedTitles.slice(0, 6),
            totals: {
                hours: totalHours,
                longestActiveStreak,
                titleCount: titleRecords.size,
                activeMonths: months.filter((month) => month.titleCount > 0).length,
                repeats: activities.reduce((sum, activity) => sum + activity.redoGained, 0),
                completions: activities.reduce((sum, activity) => sum + (activity.hadCompletion ? 1 : 0), 0),
            },
            comparison: (comparisonDefinition && totalHours > 0)
                ? {
                    secondaryLabel: comparisonDefinition.secondaryLabel,
                    referenceLabel: comparisonDefinition.referenceLabel,
                    referenceCount: totalHours / comparisonDefinition.referenceHours,
                    secondaryCount: totalHours / comparisonDefinition.secondaryHours,
                }
                : null,
        };
    }
}
