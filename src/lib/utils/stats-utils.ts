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


export const compactHistogramBins = (bins: HistogramBin[], { maxBins = 15, percentile = 0.95 }: { maxBins?: number; percentile?: number } = {}) => {
    const sortedBins = [...bins].sort((a, b) => a.start - b.start);
    if (sortedBins.length <= 1) {
        return sortedBins.map((bin) => ({ bin, isOverflow: false }));
    }

    const total = sortedBins.reduce((sum, bin) => sum + Math.max(0, bin.value), 0);
    const boundedPercentile = Math.min(1, Math.max(0, percentile));
    const boundedMaxBins = Math.max(2, Math.floor(maxBins));

    let cumulative = 0;
    const percentileTarget = total * boundedPercentile;

    const percentileEndIndex = total > 0
        ? sortedBins.findIndex((bin) => {
            cumulative += Math.max(0, bin.value);
            return cumulative >= percentileTarget;
        })
        : sortedBins.length - 1;

    const desiredRegularBins = percentileEndIndex === -1
        ? sortedBins.length
        : percentileEndIndex + 1;

    const compactedBins = sortedBins
        .slice(0, desiredRegularBins)
        .map((bin) => ({ bin, isOverflow: false }));

    if (desiredRegularBins < sortedBins.length) {
        const tailBins = sortedBins.slice(desiredRegularBins);
        compactedBins.push({
            isOverflow: true,
            bin: {
                start: tailBins[0].start,
                endExclusive: tailBins[tailBins.length - 1].endExclusive,
                value: tailBins.reduce((sum, bin) => sum + bin.value, 0),
            },
        });
    }

    while (compactedBins.length > boundedMaxBins) {
        let mergeIndex = 0;
        let smallestPairValue = Number.POSITIVE_INFINITY;

        for (let idx = 0; idx < compactedBins.length - 1; idx += 1) {
            const nextIsOverflow = compactedBins[idx + 1].isOverflow;
            if (nextIsOverflow && compactedBins.length > 2) continue;

            const pairValue = compactedBins[idx].bin.value + compactedBins[idx + 1].bin.value;
            if (pairValue < smallestPairValue) {
                mergeIndex = idx;
                smallestPairValue = pairValue;
            }
        }

        const first = compactedBins[mergeIndex];
        const second = compactedBins[mergeIndex + 1];

        compactedBins.splice(mergeIndex, 2, {
            isOverflow: first.isOverflow || second.isOverflow,
            bin: {
                start: first.bin.start,
                endExclusive: second.bin.endExclusive,
                value: first.bin.value + second.bin.value,
            },
        });
    }

    return compactedBins;
};


export const formatHistogramBin = (bin: HistogramBin, unit?: string, rangeMode: "continuous" | "integer" = "integer") => {
    const suffix = unit ? ` ${unit}` : "";

    if (rangeMode === "continuous") {
        return `${formatBucketBoundary(bin.start)}–<${formatBucketBoundary(bin.endExclusive)}${suffix}`;
    }

    const inclusiveEnd = bin.endExclusive - 1;
    if (inclusiveEnd === bin.start) {
        return `${formatBucketBoundary(bin.start)}${suffix}`;
    }

    return `${formatBucketBoundary(bin.start)}–${formatBucketBoundary(inclusiveEnd)}${suffix}`;
};


export const formatHistogramOverflowBin = (bin: HistogramBin, unit?: string) => {
    const suffix = unit ? ` ${unit}` : "";
    return `${formatBucketBoundary(bin.start)}+${suffix}`;
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
