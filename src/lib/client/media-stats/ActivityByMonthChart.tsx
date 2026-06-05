import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {formatNumber} from "@/lib/utils/number-formatting";
import {MonthlyActivityChartDatum} from "@/lib/types/activity.types";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface ActivityByMonthChartProps {
    title: string;
    stacked?: boolean;
    mediaType?: MediaType;
    mediaTypes: MediaType[];
    data: MonthlyActivityChartDatum[];
}


export function ActivityByMonthChart({ title, data, mediaTypes, mediaType, stacked = false }: ActivityByMonthChartProps) {
    const displayMediaTypes = mediaType ? [mediaType] : mediaTypes;
    const height = displayMediaTypes.length > 1 ? 350 : 300;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={data} className="-ml-6">
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: "var(--primary)" }}
                            tickFormatter={(value) => formatMonthYear(value)}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "var(--primary)", fontSize: 12 }}
                            tickFormatter={(value) => formatNumber(value, { notation: "compact" })}
                        />
                        <Tooltip
                            content={<ActivityTooltip mediaTypes={displayMediaTypes}/>}
                            cursor={{ fill: "var(--popover)" }}
                        />
                        {displayMediaTypes.map((type) =>
                            <Bar
                                key={type}
                                dataKey={type}
                                fill={getThemeColor(type)}
                                stackId={stacked ? "activity" : undefined}
                                radius={stacked || displayMediaTypes.length > 1 ? 0 : [4, 4, 0, 0]}
                            />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}


function ActivityTooltip({ active, payload, label, mediaTypes }: any & { mediaTypes: MediaType[] }) {
    if (!active || !payload?.length) return null;

    const rows = payload
        .filter((entry: any) => Number(entry.value) > 0)
        .sort((a: any, b: any) => Number(b.value) - Number(a.value));

    return (
        <div className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white">
            <p className="mb-1 font-medium">{formatMonthYear(label)}</p>
            {rows.length === 0 ?
                <p>No activity</p>
                :
                rows.map((entry: any) =>
                    <p key={entry.dataKey} className="grid grid-cols-2 gap-2 capitalize">
                        <div>{entry.dataKey}:</div>
                        <div>{formatNumber(Number(entry.value), { fractionDigits: 1, notation: "compact" })}h</div>
                    </p>
                )}
            {mediaTypes.length > 1 && rows.length > 0 &&
                <p className="mt-1 border-t border-white/20 pt-1">
                    Total: {
                        formatNumber(
                            rows.reduce((sum: number, entry: any) => sum + Number(entry.value), 0),
                            { fractionDigits: 1, notation: "compact" },
                        )
                    }h
                </p>
            }
        </div>
    );
}
