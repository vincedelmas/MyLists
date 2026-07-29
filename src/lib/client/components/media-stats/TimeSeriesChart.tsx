import {NamedValue} from "@/lib/types/stats.types";
import {formatNumber} from "@/lib/utils/number-formatting";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {ChartTooltip} from "@/lib/client/components/media-stats/ChartTooltip";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";


interface TimeSeriesChartProps {
    title: string;
    color: string;
    height?: number;
    data: NamedValue[];
    minPeriod?: string;
    description?: string;
}


export function TimeSeriesChart({ title, data, color, minPeriod, description, height = 300 }: TimeSeriesChartProps) {
    const chartData = data
        .map(({ name, value }) => ({ period: String(name), value }))
        .filter(({ period }) => !minPeriod || period >= minPeriod);

    const hasData = chartData.some(({ value }) => value > 0);

    const valueFormatter = (val: number) => formatNumber(val, { fractionDigits: 0 });

    const summary = chartData.map(({ period, value }) => ({
        value: valueFormatter(value),
        label: formatMonthYear(period),
    }));

    return (
        <ChartCard title={title} height={height} hasData={hasData} description={description} summary={summary}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart accessibilityLayer data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                    <XAxis
                        minTickGap={28}
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tick={{ fill: "var(--primary)", fontSize: 11 }}
                        tickFormatter={(val) => formatMonthYear(String(val))}
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
                                labelFormatter={(val) => formatMonthYear(val, { month: "long" })}
                            />
                        }
                    />
                    <Bar
                        fill={color}
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
