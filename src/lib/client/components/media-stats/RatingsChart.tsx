import {NamedValue} from "@/lib/types/stats.types";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatNumber} from "@/lib/utils/number-formatting";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {transformRatingToFeeling} from "@/lib/utils/stats-utils";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";


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
    }));

    return (
        <ChartCard title={title} summary={summary} hasData={hasData} height={chartHeight}>
            <DataBarChart
                x="name"
                y="value"
                data={chartData}
                ariaLabel={title}
                height={chartHeight}
                integerYTicks={true}
                tooltipTitleFormatter={String}
                fill={getThemeColor(mediaType)}
                tooltipValueFormatter={(value) => formatNumber(value)}
                xTickFontSize={ratingSystem === RatingSystemType.FEELING ? 18 : undefined}
                xFormatter={(value) => ratingSystem === RatingSystemType.FEELING
                    ? ({ 0: "💩", 2: "😠", 4: "🙁", 6: "🙂", 8: "😄", 10: "🤩" }[Number(value)] ?? String(value))
                    : String(value)
                }
            />
        </ChartCard>
    );
}
