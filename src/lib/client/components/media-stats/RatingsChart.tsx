import {NamedValue} from "@/lib/types/stats.types";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatNumber} from "@/lib/utils/number-formatting";
import {getFeelingIcon} from "@/lib/utils/ratings-formatting";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {transformRatingToFeeling} from "@/lib/utils/stats-utils";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {ChartTooltip} from "@/lib/client/components/media-stats/ChartTooltip";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";


interface RatingsChartProps {
    height?: number;
    mediaType: MediaType;
    ratings: NamedValue[];
    ratingSystem: RatingSystemType;
}


export function RatingsChart({ height, ratings, mediaType, ratingSystem }: RatingsChartProps) {
    const chartHeight = height ?? 250;

    const chartData = ratingSystem === RatingSystemType.FEELING
        ? transformRatingToFeeling(ratings)
        : ratings;

    const title = ratingSystem === RatingSystemType.FEELING
        ? "Feeling Distribution"
        : "Rating Distribution";

    const hasData = chartData.some(({ value }) => value > 0);
    const summary = chartData.map(({ name, value }) => ({
        value: formatNumber(value),
        label: `${ratingSystem === RatingSystemType.FEELING ? "Feeling" : "Rating"} ${name}`,
    }))

    return (
        <ChartCard title={title} summary={summary} hasData={hasData} height={chartHeight}>
            <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={chartData} accessibilityLayer margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                    <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={ratingSystem === RatingSystemType.FEELING
                            ? <FeelingTickXAxis/>
                            : { fill: "var(--primary)", fontSize: 11 }
                        }
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tick={{ fill: "var(--primary)", fontSize: 11 }}
                    />
                    <Tooltip
                        cursor={{ fill: "var(--popover)" }}
                        content={<ChartTooltip valueFormatter={(val) => formatNumber(val)}/>}
                    />
                    <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        fill={getThemeColor(mediaType)}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}


interface FeelingTickProps {
    x?: number;
    y?: number;
    payload?: {
        value?: number;
    };
}


const FeelingTickXAxis = ({ x = 0, y = 0, payload }: FeelingTickProps) => {
    return (
        <g transform={`translate(${x},${y})`}>
            <foreignObject x="-9" y="2" width="20" height="20">
                {getFeelingIcon(Number(payload?.value), { size: 18 })}
            </foreignObject>
        </g>
    );
};
