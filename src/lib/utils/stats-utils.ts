import {MediaType} from "@/lib/utils/enums";
import {MonthlyActivityChartDatum} from "@/lib/types/activity.types";
import {CompactedHistogramBin, HistogramBin, HistogramTailDir, NamedValue} from "@/lib/types/stats.types";


const formatBucketBoundary = (value: number) => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};


const mergeHistogramBins = (bins: HistogramBin[]) => {
    return {
        start: bins[0].start,
        endExclusive: bins[bins.length - 1].endExclusive,
        value: bins.reduce((sum, bin) => sum + bin.value, 0),
    };
}


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
        return `${formatBucketBoundary(bin.start)}–<${formatBucketBoundary(bin.endExclusive)}${suffix}`;
    }

    const inclusiveEnd = bin.endExclusive - 1;
    if (inclusiveEnd === bin.start) {
        return `${formatBucketBoundary(bin.start)}${suffix}`;
    }

    return `${formatBucketBoundary(bin.start)}–${formatBucketBoundary(inclusiveEnd)}${suffix}`;
};


export const formatHistogramOverflowBin = (bin: HistogramBin, direction: HistogramTailDir, unit?: string) => {
    const suffix = unit ? ` ${unit}` : "";

    return direction === "lower"
        ? `Before ${formatBucketBoundary(bin.endExclusive)}${suffix}`
        : `${formatBucketBoundary(bin.start)}+${suffix}`;
};


interface CompactHistogramParams {
    maxBins?: number;
    percentile?: number;
    tailDirection?: HistogramTailDir;
}


export const compactHistogramBins = (bins: HistogramBin[], { maxBins = 12, percentile = 0.95, tailDirection = "upper" }: CompactHistogramParams = {}) => {
    const sortedBins = [...bins].sort((a, b) => a.start - b.start);
    if (sortedBins.length <= maxBins) {
        return sortedBins.map((bin) => ({ bin, overflow: null, sourceBinCount: 1 }));
    }

    const total = sortedBins.reduce((sum, bin) => sum + bin.value, 0);
    const isUpperTail = tailDirection === "upper";
    const percentileTarget = total * (isUpperTail ? percentile : 1 - percentile);

    let cumulative = 0;
    const percentileIndex = sortedBins.findIndex((bin) => {
        cumulative += bin.value;
        return cumulative >= percentileTarget;
    });

    const regularBins = isUpperTail
        ? sortedBins.slice(0, percentileIndex + 1)
        : sortedBins.slice(percentileIndex);

    const tailBins = isUpperTail
        ? sortedBins.slice(percentileIndex + 1)
        : sortedBins.slice(0, percentileIndex);

    const overflowBin: CompactedHistogramBin | null = tailBins.length > 0
        ? {
            overflow: tailDirection,
            sourceBinCount: tailBins.length,
            bin: mergeHistogramBins(tailBins),
        }
        : null;

    const compactedRegularBins: CompactedHistogramBin[] = [];
    const availableRegularBins = maxBins - (overflowBin ? 1 : 0);
    const groupSize = Math.ceil(regularBins.length / availableRegularBins);

    for (let idx = 0; idx < regularBins.length; idx += groupSize) {
        const groupedBins = regularBins.slice(idx, idx + groupSize);
        compactedRegularBins.push({
            overflow: null,
            sourceBinCount: groupedBins.length,
            bin: mergeHistogramBins(groupedBins),
        });
    }

    if (!overflowBin) {
        return compactedRegularBins;
    }

    return overflowBin.overflow === "lower"
        ? [overflowBin, ...compactedRegularBins]
        : [...compactedRegularBins, overflowBin];
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
