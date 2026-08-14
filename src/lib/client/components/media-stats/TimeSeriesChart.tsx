import {NamedValue} from "@/lib/types/stats.types";
import {formatNumber} from "@/lib/utils/number-formatting";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";


interface TimeSeriesChartProps {
    title: string;
    color: string;
    height?: number;
    data: NamedValue[];
    minPeriod?: string;
    description?: string;
}


export function TimeSeriesChart({ title, data, color, minPeriod, description, height = 300 }: TimeSeriesChartProps) {
    const chartData = minPeriod ? data.filter(({ name }) => String(name) >= minPeriod) : data;

    const hasData = chartData.some(({ value }) => value > 0);

    const valueFormatter = (val: number) => formatNumber(val, { fractionDigits: 0 });

    const summary = chartData.map(({ name, value }) => ({
        value: valueFormatter(value),
        label: formatMonthYear(String(name)),
    }));

    return (
        <ChartCard title={title} height={height} hasData={hasData} description={description} summary={summary}>
            <DataBarChart
                x="name"
                y="value"
                fill={color}
                xTickGap={28}
                height={height}
                data={chartData}
                ariaLabel={title}
                integerYTicks={true}
                tooltipValueFormatter={valueFormatter}
                xFormatter={(value) => formatMonthYear(String(value))}
                yFormatter={(value) => formatNumber(value, { notation: "compact", locale: "en" })}
                tooltipTitleFormatter={(value) => formatMonthYear(String(value), { month: "long" })}
            />
        </ChartCard>
    );
}
