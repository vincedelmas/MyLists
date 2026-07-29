import {MediaType} from "@/lib/utils/enums";
import {HistogramBin} from "@/lib/types/stats.types";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatNumber} from "@/lib/utils/number-formatting";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {ChartTooltip} from "@/lib/client/components/media-stats/ChartTooltip";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {compactHistogramBins, formatHistogramBin, formatHistogramOverflowBin} from "@/lib/utils/stats-utils";


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
    const compactedBins = compactHistogramBins(data);
    const chartData = compactedBins.map(({ bin, isOverflow }) => ({
        value: bin.value,
        label: isOverflow
            ? formatHistogramOverflowBin(bin, unit)
            : formatHistogramBin(bin, unit, rangeMode),
    }));

    const hasData = chartData.some(({ value }) => value > 0);

    const valueFormatter = (val: number) => formatNumber(val, { fractionDigits: 0, locale: "fr" });
    const summary = chartData.map(({ label, value }) => ({ label, value: valueFormatter(value) }))
    const chartDescription = compactedBins.some(({ isOverflow }) => isOverflow)
        ? [description, "The remaining data are aggregated in the final bar."].filter(Boolean).join(" ")
        : description;

    return (
        <ChartCard title={title} height={height} hasData={hasData} description={chartDescription} summary={summary}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart accessibilityLayer data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -30 }}>
                    <XAxis
                        dataKey="label"
                        minTickGap={14}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={{ fill: "var(--primary)", fontSize: 11 }}
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
