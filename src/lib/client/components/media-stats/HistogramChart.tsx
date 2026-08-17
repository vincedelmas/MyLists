import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatNumber} from "@/lib/utils/number-formatting";
import {HistogramBin, HistogramTailDir} from "@/lib/types/stats.types";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {compactHistogramBins, formatHistogramBin, formatHistogramOverflowBin} from "@/lib/utils/stats-utils";


interface HistogramChartProps {
    title: string;
    unit?: string;
    height?: number;
    data: HistogramBin[];
    mediaType: MediaType;
    description?: string;
    tailDirection?: HistogramTailDir;
    rangeMode?: "continuous" | "integer";
}


export function HistogramChart(props: HistogramChartProps) {
    const { title, data, mediaType, unit, description, height = 300, rangeMode = "integer", tailDirection = "upper" } = props;

    const compactedBins = compactHistogramBins(data, { tailDirection });
    const overflow = compactedBins.find(item => item.overflow)?.overflow;

    const chartData = compactedBins.map(({ bin, overflow }) => ({
        value: bin.value,
        label: overflow
            ? formatHistogramOverflowBin(bin, overflow, unit)
            : formatHistogramBin(bin, unit, rangeMode),
    }));

    const hasData = chartData.some(({ value }) => value > 0);

    const valueFormatter = (value: number) => formatNumber(value, { fractionDigits: 0, locale: "fr" });

    const summary = chartData.map(({ label, value }) => ({ label, value: valueFormatter(value) }));
    const compactionDescription = [
        overflow === "lower" ? "Earlier data are aggregated in the first bar." : null,
        overflow === "upper" ? "The upper range is aggregated in the final bar." : null,
    ].filter(Boolean).join(" ");

    const chartDescription = [description, compactionDescription].filter(Boolean).join(" ") || undefined;

    return (
        <ChartCard title={title} height={height} hasData={hasData} description={chartDescription} summary={summary}>
            <DataBarChart
                x="label"
                y="value"
                xTickGap={14}
                height={height}
                data={chartData}
                ariaLabel={title}
                integerYTicks={true}
                fill={getThemeColor(mediaType)}
                tooltipValueFormatter={valueFormatter}
                yFormatter={(value) => formatNumber(value, { notation: "compact", locale: "en" })}
            />
        </ChartCard>
    );
}
