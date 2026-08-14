import {formatNumber} from "@/lib/utils/number-formatting";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";


type CategoricalChartDatum = {
    name: string;
    value: number;
    color: string;
};


interface CategoricalBarChartProps {
    title: string;
    height?: number;
    description?: string;
    data: CategoricalChartDatum[];
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
            <DataBarChart
                x="name"
                y="value"
                data={data}
                height={height}
                ariaLabel={title}
                tooltipValueFormatter={valueFormatter}
                fill={({ color }) => color}
                xFormatter={(value) => labelFormatter(String(value))}
                yFormatter={(value) => formatNumber(value, { notation: "compact" })}
                tooltipTitleFormatter={(value) => labelFormatter(String(value))}
            />
        </ChartCard>
    );
}
