import {formatNumber} from "@/lib/utils/number-formatting";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {ChartTooltip} from "@/lib/client/components/media-stats/ChartTooltip";
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";


type CategoricalChartDatum = {
    name: string;
    value: number;
    color: string;
};


interface CategoricalBarChartProps {
    title: string;
    data: CategoricalChartDatum[];
    height?: number;
    description?: string;
    labelFormatter?: (label: string) => string;
    valueFormatter?: (value: number) => string;
}


export function CategoricalBarChart(props: CategoricalBarChartProps) {
    const {
        data, title, description, height = 350,
        labelFormatter = (val) => val,
        valueFormatter = (val) => formatNumber(val, { fractionDigits: 1, notation: "compact" }),
    } = props;

    const hasData = data.some(({ value }) => value > 0);

    const summary = data.map(({ name, value }) => {
        return ({
            label: labelFormatter(name),
            value: valueFormatter(value),
        });
    })

    return (
        <ChartCard title={title} height={height} summary={summary} hasData={hasData} description={description}>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                    <XAxis
                        dataKey="name"
                        minTickGap={16}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={labelFormatter}
                        tick={{ fill: "var(--primary)", fontSize: 11 }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--primary)", fontSize: 11 }}
                        tickFormatter={(value) => formatNumber(value, { notation: "compact" })}
                    />
                    <Tooltip
                        cursor={{ fill: "var(--popover)" }}
                        content={
                            <ChartTooltip
                                labelFormatter={labelFormatter}
                                valueFormatter={valueFormatter}
                            />
                        }
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map(({ name, color }) =>
                            <Cell key={name} fill={color}/>
                        )}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}
