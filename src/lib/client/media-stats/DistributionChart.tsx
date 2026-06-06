import {useMemo} from "react";
import {MediaType} from "@/lib/utils/enums";
import {NamedValue} from "@/lib/types/stats.types";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatNumber} from "@/lib/utils/number-formatting";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Bar, BarChart, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";


interface DistributionChartProps {
    title: string;
    unit?: string;
    height?: number;
    data: NamedValue[];
    mediaType?: MediaType;
    enableBinning?: boolean;
}


export function DistributionChart({ title, mediaType, data, unit, enableBinning = false, height = 250 }: DistributionChartProps) {
    const chartData = data.map((datum, idx) => {
        const value = datum.value;
        let displayName = String(datum.name);

        if (enableBinning && Number.isFinite(Number(datum.name))) {
            const currentName = Number(datum.name);
            const nextItem = data[idx + 1];

            if (nextItem && Number.isFinite(Number(nextItem.name))) {
                const nextName = Number(nextItem.name);
                displayName = `${currentName} - ${nextName - 1} ${unit ?? ""}`;
            }
            else {
                displayName = `${currentName}+`;
            }
        }

        return {
            value: value,
            name: displayName,
            originalName: datum.name,
        };
    });

    const bottomMargin = useMemo(() => {
        if (!chartData.length || !enableBinning) return 0;

        const longestLabel = chartData.reduce((max, d) => (d.name.length > max.length ? d.name : max), "");
        const estimatedHeight = 12 * 1.4 + (longestLabel.length * 0.1);

        return Math.max(15, Math.min(40, estimatedHeight + 10));
    }, [chartData, enableBinning]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={chartData} className="-ml-6" margin={{ bottom: enableBinning ? bottomMargin : 0 }}>
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            angle={enableBinning ? -30 : 0}
                            tickFormatter={(v) => capitalize(v)}
                            tick={{
                                fontSize: 12,
                                fill: "var(--primary)",
                                textAnchor: enableBinning ? "end" : "middle",
                            }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--primary)", fontSize: 12 }}
                            tickFormatter={(value) => formatNumber(value, { notation: "compact" })}
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
                            <LabelList
                                dataKey="value"
                                position="center"
                                content={customLabel}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}


const CustomizedBar = (props: any) => {
    const { payload, mediaType, getThemeColor } = props;
    const fillColor = getThemeColor(mediaType ?? (String(payload.originalName) as MediaType));
    return <Rectangle {...props} fill={fillColor}/>;
};


const customLabel = ({ x, y, width, height, value }: any) => {
    if (!height || !width) return null;

    if (Number(height) < 17 || Number(width) < 28) {
        return null;
    }

    const X = Number(x) + Number(width) / 2;
    const Y = Number(y) + Number(height) / 2;

    return (
        <text x={X} y={Y} fontWeight={500} textAnchor="middle" dominantBaseline="central" fontSize={Number(height) < 20 ? 12 : 14}>
            {formatNumber(Number(value), { fractionDigits: 1, notation: "compact" })}
        </text>
    );
};


export const CustomTooltip = (props: any) => {
    const { active, payload, label } = props;

    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800 px-4 py-2 rounded-md capitalize">
                <p>Label: {label}</p>
                <p>Value: {`${formatNumber(payload[0].value, { fractionDigits: 1, notation: "compact" })}`}</p>
            </div>
        );
    }

    return null;
};
