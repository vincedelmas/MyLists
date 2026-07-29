import {MediaType} from "@/lib/utils/enums";
import {HistogramBin} from "@/lib/types/stats.types";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatNumber} from "@/lib/utils/number-formatting";
import {formatHistogramBin} from "@/lib/utils/stats-utils";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {ChartTooltip} from "@/lib/client/components/media-stats/ChartTooltip";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";


interface HistogramChartProps {
    title: string;
    unit?: string;
    height?: number;
    data: HistogramBin[];
    mediaType: MediaType;
    description?: string;
    rangeMode?: "continuous" | "integer";
}


export function HistogramChart({ title, data, mediaType, unit, description, height = 300, rangeMode = "integer" }: HistogramChartProps) {
    const chartData = data.map(bin => ({ value: bin.value, label: formatHistogramBin(bin, unit, rangeMode) }));
    const hasData = chartData.some(({ value }) => value > 0);

    const valueFormatter = (val: number) => formatNumber(val, { fractionDigits: 0, locale: "fr" });
    const summary = chartData.map(({ label, value }) => ({ label, value: valueFormatter(value) }))

    return (
        <ChartCard title={title} height={height} hasData={hasData} description={description} summary={summary}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart accessibilityLayer data={chartData} margin={{ top: 8, right: 4, bottom: 28, left: -20 }}>
                    <XAxis
                        angle={-30}
                        height={48}
                        dataKey="label"
                        minTickGap={10}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={{ fill: "var(--primary)", fontSize: 11, textAnchor: "end" }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tick={{ fill: "var(--primary)", fontSize: 11 }}
                        tickFormatter={(val) => formatNumber(val, { notation: "compact", locale: "en" })}
                    />
                    <Tooltip
                        cursor={{ fill: "var(--popover)" }}
                        content={
                            <ChartTooltip
                                valueFormatter={valueFormatter}
                            />
                        }
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
