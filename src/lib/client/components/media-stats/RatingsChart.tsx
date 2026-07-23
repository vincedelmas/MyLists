import {NamedValue} from "@/lib/types/stats.types";
import {getFeelingList} from "@/lib/utils/ratings-formatting";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {transformRatingToFeeling} from "@/lib/utils/stats-utils";
import {CustomTooltip} from "@/lib/client/components/media-stats/DistributionChart";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Bar, BarChart, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";


interface RatingsChartProps {
    height?: number;
    mediaType: MediaType;
    ratings: NamedValue[];
    ratingSystem: RatingSystemType;
}


export function RatingsChart({ height, ratings, mediaType, ratingSystem }: RatingsChartProps) {
    const chartData = (ratingSystem === RatingSystemType.FEELING) ? transformRatingToFeeling(ratings) : ratings;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">
                    {ratingSystem === RatingSystemType.FEELING ?
                        "Feeling Distribution"
                        :
                        "Rating Distribution"
                    }
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={height ?? 250} className="-ml-6">
                    <BarChart data={chartData}>
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tick={ratingSystem === RatingSystemType.FEELING ?
                                <FeelingTickXAxis/> : { fill: "var(--muted-foreground)", fontSize: 11 }
                            }
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        />
                        <Tooltip
                            content={CustomTooltip}
                            cursor={{ fill: "var(--popover)" }}
                        />
                        <Bar
                            dataKey="value"
                            radius={[4, 4, 0, 0]}
                            shape={(props: any) =>
                                <CustomizedBar
                                    {...props}
                                    mediaType={mediaType}
                                    getThemeColor={getThemeColor}
                                />
                            }
                        >
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}


const CustomizedBar = (props: any) => {
    const { mediaType, getThemeColor } = props;
    const fillColor = getThemeColor(mediaType);
    return <Rectangle {...props} fill={fillColor}/>;
};


const FeelingTickXAxis = (props: any) => {
    const { x, y, payload } = props;

    const getFeelingComponent = (value: number) => {
        const feelings = getFeelingList({ size: 18 });
        const feeling = feelings.find((item) => item.label === value.toString());

        return feeling ? feeling.value : DEFAULT_DASH_FALLBACK;
    };

    return (
        <g transform={`translate(${x},${y})`}>
            <foreignObject x="-9" y="2" width="20" height="20">
                {getFeelingComponent(payload.value)}
            </foreignObject>
        </g>
    );
};
