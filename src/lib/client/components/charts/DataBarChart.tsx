import {ReactNode, useMemo} from "react";
import {cn} from "@/lib/utils/classnames";
import {Chart} from "@tanstack/charts/react/tooltip";
import {scaleBand} from "@tanstack/charts/scales/band";
import {scaleLinear} from "@tanstack/charts/scales/linear";
import {chartAxisStyle, chartThemes, chartTooltipOptions} from "@/lib/client/components/charts/chartDefaults";
import {barY, Channel, ChannelAccessorContext, ChartKey, defineChart, group, stack, VisualChannel} from "@tanstack/charts";


const singleSeries = "value";


interface DataBarChartProps<TDatum> {
    height: number;
    ariaLabel: string;
    xTickGap?: number;
    xTickFontSize?: number;
    className?: string;
    showGrid?: boolean;
    data: readonly TDatum[];
    integerYTicks?: boolean;
    y: Channel<TDatum, number>;
    z?: Channel<TDatum, string>;
    seriesOrder?: readonly string[];
    hideZeroTooltipValues?: boolean;
    key?: Channel<TDatum, ChartKey>;
    x: Channel<TDatum, string | number>;
    fill: VisualChannel<TDatum, string>;
    yFormatter?: (value: number) => string;
    mode?: "single" | "grouped" | "stacked";
    xFormatter?: (value: string | number) => string;
    tooltipTotalFormatter?: (value: number) => string;
    tooltipValueFormatter?: (value: number) => string;
    tooltipSeriesIcon?: (series: string) => ReactNode;
    tooltipSeriesFormatter?: (series: string) => string;
    tooltipTitleFormatter?: (value: string | number) => string;
}


export function DataBarChart<TDatum>(props: DataBarChartProps<TDatum>) {
    const {
        tooltipSeriesIcon,
        x, y, z, fill, key,
        xFormatter = String,
        yFormatter = String,
        tooltipTotalFormatter,
        hideZeroTooltipValues = false,
        tooltipSeriesFormatter = String,
        tooltipValueFormatter = yFormatter,
        tooltipTitleFormatter = xFormatter,
        data, height, ariaLabel, className, seriesOrder,
        mode = "single", showGrid = false, integerYTicks = false,
        xTickGap = 16, xTickFontSize = chartAxisStyle.tickLabels.fontSize,
    } = props;

    const chart = useMemo(() => {
        let yTickValues: number[] | undefined;
        const resolvedSeriesOrder = seriesOrder ?? Array.from(new Set(data.map((datum, index) => {
            return z ? resolveChannel(z, datum, { data, index }) : singleSeries;
        })));

        if (integerYTicks) {
            let maximum = Math.max(0, ...data.map((datum, index) => {
                return resolveChannel(y, datum, { data, index });
            }));

            if (mode === "stacked") {
                const totals = new Map<string | number, number>();
                data.forEach((datum, index) => {
                    const context = { data, index };
                    const category = resolveChannel(x, datum, context);
                    const value = resolveChannel(y, datum, context);
                    totals.set(category, (totals.get(category) ?? 0) + value);
                });
                maximum = Math.max(0, ...totals.values());
            }

            if (maximum === 0) {
                yTickValues = [0];
            }
            else {
                const roughStep = maximum / 5;
                const magnitude = 10 ** Math.floor(Math.log10(roughStep));

                const residual = roughStep / magnitude;
                const step = Math.max(1, (residual >= 5 ? 5 : residual >= 2 ? 2 : 1) * magnitude);
                const upperBound = Math.ceil(maximum / step) * step;

                yTickValues = Array.from(
                    { length: Math.floor(upperBound / step) + 1 },
                    (_value, index) => index * step,
                );
            }
        }

        return {
            resolvedSeriesOrder,
            definition: defineChart({
                focus: "group-x",
                theme: chartThemes.default,
                maxFocusDistance: Number.POSITIVE_INFINITY,
                marks: [
                    barY(data, {
                        inset: 1,
                        radius: mode === "stacked" ? 0 : 4,
                        x: (datum, context) => resolveChannel(x, datum, context),
                        y: (datum, context) => resolveChannel(y, datum, context),
                        fill: (datum, context) => resolveFill(fill, datum, context),
                        z: (datum, context) => z ? resolveChannel(z, datum, context) : singleSeries,
                        key: (datum, context) => key
                            ? resolveChannel(key, datum, context)
                            : `${resolveChannel(x, datum, context)}:${z ? resolveChannel(z, datum, context) : singleSeries}`,
                        layout: mode === "grouped"
                            ? group({ padding: 0.08 })
                            : mode === "stacked"
                                ? stack({ order: resolvedSeriesOrder })
                                : undefined,
                    }),
                ],
                x: {
                    grid: false,
                    scale: () => scaleBand<string | number>().padding(0.12),
                    axis: {
                        ...chartAxisStyle,
                        ticks: {
                            ...chartAxisStyle.ticks,
                            format: xFormatter,
                        },
                        tickLabels: {
                            ...chartAxisStyle.tickLabels,
                            fontSize: xTickFontSize,
                            thin: {
                                minGap: xTickGap,
                                priority: "ends",
                            },
                        },
                    },
                },
                y: {
                    nice: true,
                    grid: showGrid,
                    scale: scaleLinear,
                    axis: {
                        ...chartAxisStyle,
                        ticks: {
                            ...chartAxisStyle.ticks,
                            format: yFormatter,
                            values: yTickValues,
                        },
                    },
                },
                tooltip: {
                    ...chartTooltipOptions,
                    anchor: "group-center",
                    content: (points) => ({
                        title: points[0] ? tooltipTitleFormatter(points[0].xValue) : undefined,
                        rows: points
                            .filter(({ yValue }) => !hideZeroTooltipValues || yValue > 0)
                            .sort((left, right) => hideZeroTooltipValues ? right.yValue - left.yValue : 0)
                            .map(({ datum, datumIndex, groupLabel, yValue }) => ({
                                color: resolveFill(fill, datum, { data, index: datumIndex }),
                                value: tooltipValueFormatter(yValue),
                                label: resolvedSeriesOrder.length > 1 ? tooltipSeriesFormatter(groupLabel) : "",
                            })),
                    }),
                },
            }),
        };
    }, [
        data, fill, hideZeroTooltipValues, integerYTicks, key, mode, seriesOrder, showGrid,
        tooltipSeriesFormatter, tooltipTitleFormatter, tooltipValueFormatter,
        x, xFormatter, xTickFontSize, xTickGap, y, yFormatter, z,
    ]);

    return (
        <Chart
            height={height}
            ariaLabel={ariaLabel}
            definition={chart.definition}
            className={cn("mylists-chart", className)}
            renderTooltipBody={({ points }) => {
                const visiblePoints = points
                    .filter(({ yValue }) => !hideZeroTooltipValues || yValue > 0)
                    .sort((left, right) => {
                        return hideZeroTooltipValues ? right.yValue - left.yValue : 0;
                    });

                const title = points[0] ? tooltipTitleFormatter(points[0].xValue) : "";

                return (
                    <div className="min-w-24 text-sm text-popover-foreground">
                        <p className={cn("font-medium", visiblePoints.length > 1 && "mb-2")}>
                            {title}
                        </p>
                        {visiblePoints.length === 0 ?
                            <p className="text-muted-foreground">
                                No activity.
                            </p>
                            :
                            visiblePoints.map(({ datum, datumIndex, groupLabel, key, yValue }) =>
                                chart.resolvedSeriesOrder.length > 1 ?
                                    <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-0.5">
                                        <span className="flex items-center gap-1.5 capitalize">
                                            {tooltipSeriesIcon?.(groupLabel) ??
                                                <span
                                                    className="size-2 rounded-sm"
                                                    style={{ backgroundColor: resolveFill(fill, datum, { data, index: datumIndex }) }}
                                                />
                                            }
                                            {tooltipSeriesFormatter(groupLabel)}
                                        </span>
                                        <span className="text-right text-muted-foreground">
                                            {tooltipValueFormatter(yValue)}
                                        </span>
                                    </div>
                                    :
                                    <p key={key} className="mt-0.5 text-muted-foreground">
                                        {tooltipValueFormatter(yValue)}
                                    </p>
                            )
                        }
                        {tooltipTotalFormatter && chart.resolvedSeriesOrder.length > 1 && visiblePoints.length > 0 &&
                            <p className="mt-1 border-t pt-1">
                                Total: {tooltipTotalFormatter(visiblePoints.reduce((sum, { yValue }) => sum + yValue, 0))}
                            </p>
                        }
                    </div>
                );
            }}
        />
    );
}


function resolveChannel<TDatum, TValue>(
    channel: Channel<TDatum, TValue>,
    datum: TDatum,
    context: ChannelAccessorContext<TDatum>,
) {
    return typeof channel === "function"
        ? channel(datum, context)
        : datum[channel as keyof TDatum] as TValue;
}


function resolveFill<TDatum>(
    fill: VisualChannel<TDatum, string>,
    datum: TDatum,
    context: ChannelAccessorContext<TDatum>,
) {
    return typeof fill === "function" ? fill(datum, context) : fill;
}
