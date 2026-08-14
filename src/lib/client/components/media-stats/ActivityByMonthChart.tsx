import {fold} from "@tanstack/charts";
import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {formatNumber} from "@/lib/utils/number-formatting";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {MonthlyActivityChartDatum} from "@/lib/types/activity.types";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";


interface ActivityByMonthChartProps {
    title: string;
    stacked?: boolean;
    mediaType?: MediaType;
    mediaTypes: MediaType[];
    data: MonthlyActivityChartDatum[];
    range: {
        endMonth: string;
        startMonth: string;
    };
}


export function ActivityByMonthChart({ title, data, mediaTypes, mediaType, range, stacked = false }: ActivityByMonthChartProps) {
    const hasData = data.some(({ total }) => total > 0);
    const requestedMediaTypes = mediaType ? [mediaType] : mediaTypes;

    const description = `${formatMonthYear(range.startMonth)} – ${formatMonthYear(range.endMonth)}`;
    const populatedMediaTypes = requestedMediaTypes.filter(mt => data.some((datum) => Number(datum[mt]) > 0));

    const displayMediaTypes = populatedMediaTypes.length > 0 ? populatedMediaTypes : requestedMediaTypes;
    const height = displayMediaTypes.length > 1 ? 350 : 300;

    const chartData = fold(data, {
        fields: ALL_MEDIA_TYPES,
        as: { key: "mediaType", value: "hours" },
    }).filter(({ mediaType }) => displayMediaTypes.includes(mediaType));

    return (
        <ChartCard
            title={title}
            height={height}
            hasData={hasData}
            description={description}
            summary={data.map(({ month, total }) => ({
                label: formatMonthYear(month),
                value: `${formatNumber(total)} hours`,
            }))}
        >
            <DataBarChart
                x="month"
                z="mediaType"
                xTickGap={28}
                height={height}
                data={chartData}
                ariaLabel={title}
                hideZeroTooltipValues={true}
                seriesOrder={displayMediaTypes}
                y={({ hours }) => hours ?? 0}
                xFormatter={(value) => formatMonthYear(String(value))}
                yFormatter={(value) => formatNumber(value, { notation: "compact" })}
                mode={stacked ? "stacked" : displayMediaTypes.length > 1 ? "grouped" : "single"}
                fill={({ mediaType }) => getThemeColor(mediaType)}
                tooltipSeriesIcon={(series) => <MainThemeIcon type={series as MediaType} size={14}/>}
                tooltipValueFormatter={(value) => `${formatNumber(value, { fractionDigits: 0 })} hours`}
                tooltipTotalFormatter={(value) => `${formatNumber(value, { fractionDigits: 0 })} hours`}
                tooltipTitleFormatter={(value) => formatMonthYear(String(value), { month: "long" })}
            />
        </ChartCard>
    );
}
