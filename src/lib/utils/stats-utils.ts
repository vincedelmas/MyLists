import {MediaType} from "@/lib/utils/enums";
import {HistogramBin, NamedValue} from "@/lib/types/stats.types";
import {MonthlyActivityChartDatum} from "@/lib/types/activity.types";


const formatBucketBoundary = (value: number) => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};


export const transformRatingToFeeling = (ratings: NamedValue[]) => {
    const feelingValues = [0, 2, 4, 6, 8, 10];
    const feelings = feelingValues.map((name) => ({ name, value: 0 }));

    ratings.forEach((item) => {
        const rating = Number(item.name);
        if (item.value === 0 || !Number.isFinite(rating)) return;

        const closestFeeling = feelingValues.reduce((prev, curr) => {
            const currentDistance = Math.abs(rating - curr);
            const previousDistance = Math.abs(rating - prev);
            return currentDistance < previousDistance ? curr : prev;
        });

        feelings[feelingValues.indexOf(closestFeeling)].value += item.value;
    });

    return feelings;
};


export const toHistogramBins = (points: NamedValue[], getEndExclusive: (start: number) => number): HistogramBin[] => {
    return points.flatMap(({ name, value }) => {
        const start = Number(name);
        const endExclusive = getEndExclusive(start);

        if (!Number.isFinite(start) || !Number.isFinite(endExclusive) || endExclusive <= start) {
            return [];
        }

        return [{ start, value, endExclusive }];
    });
};


export const formatHistogramBin = (bin: HistogramBin, unit?: string, rangeMode: "continuous" | "integer" = "integer") => {
    const suffix = unit ? ` ${unit}` : "";

    if (rangeMode === "continuous") {
        return `${formatBucketBoundary(bin.start)}–${formatBucketBoundary(bin.endExclusive)}${suffix}`;
    }

    const inclusiveEnd = bin.endExclusive - 1;
    if (inclusiveEnd === bin.start) {
        return `${formatBucketBoundary(bin.start)}${suffix}`;
    }

    return `${formatBucketBoundary(bin.start)}–${formatBucketBoundary(inclusiveEnd)}${suffix}`;
};


interface MonthlyActivityTimelineParams {
    endMonth: string;
    startMonth: string;
    mediaTypes: MediaType[];
    data: MonthlyActivityChartDatum[];
}


export const fillMonthlyActivityTimeline = ({ data, endMonth, mediaTypes, startMonth }: MonthlyActivityTimelineParams) => {
    const endDate = new Date(`${endMonth}-01T00:00:00.000Z`);
    const currentDate = new Date(`${startMonth}-01T00:00:00.000Z`);

    if (Number.isNaN(currentDate.getTime()) || Number.isNaN(endDate.getTime()) || currentDate > endDate) {
        return [];
    }

    const result: MonthlyActivityChartDatum[] = [];
    const byMonth = new Map(data.map(entry => [entry.month, entry]));

    while (currentDate <= endDate) {
        const month = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, "0")}`;
        result.push(byMonth.get(month) ?? {
            month,
            total: 0,
            ...Object.fromEntries(mediaTypes.map((mediaType) => [mediaType, 0])),
        } as MonthlyActivityChartDatum);

        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }

    return result;
};
