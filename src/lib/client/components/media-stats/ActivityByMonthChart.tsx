import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {formatNumber} from "@/lib/utils/number-formatting";
import {MonthlyActivityChartDatum} from "@/lib/types/activity.types";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {Bar, BarChart, ResponsiveContainer, Tooltip, TooltipContentProps, XAxis, YAxis} from "recharts";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";


interface ActivityByMonthChartProps {
    title: string;
    stacked?: boolean;
    mediaType?: MediaType;
    mediaTypes: MediaType[];
    data: MonthlyActivityChartDatum[];
    range: {
        endMonth: string;
        startMonth: string;
    };
}


export function ActivityByMonthChart({ title, data, mediaTypes, mediaType, range, stacked = false }: ActivityByMonthChartProps) {
    const hasData = data.some(({ total }) => total > 0);
    const requestedMediaTypes = mediaType ? [mediaType] : mediaTypes;

    const description = `${formatMonthYear(range.startMonth)} – ${formatMonthYear(range.endMonth)}`;
    const populatedMediaTypes = requestedMediaTypes.filter(mt => data.some((datum) => Number(datum[mt]) > 0));

    const displayMediaTypes = populatedMediaTypes.length > 0 ? populatedMediaTypes : requestedMediaTypes;
    const height = displayMediaTypes.length > 1 ? 350 : 300;

    return (
        <ChartCard
            title={title}
            height={height}
            hasData={hasData}
            description={description}
            summary={data.map(({ month, total }) => ({
                label: formatMonthYear(month),
                value: `${formatNumber(total)} hours`,
            }))}
        >
            <ResponsiveContainer width="100%" height={height}>
                <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 4, bottom: 0, left: -30 }}>
                    <XAxis
                        minTickGap={28}
                        tickLine={false}
                        axisLine={false}
                        dataKey={"month"}
                        interval="preserveStartEnd"
                        tick={{ fontSize: 11, fill: "var(--primary)" }}
                        tickFormatter={(val) => formatMonthYear(String(val))}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--primary)" }}
                        tickFormatter={(val) => formatNumber(val, { notation: "compact" })}
                    />
                    <Tooltip
                        cursor={{ fill: "var(--popover)" }}
                        content={<ActivityTooltip mediaTypes={displayMediaTypes}/>}
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
        </ChartCard>
    );
}


interface ActivityTooltipProps extends Partial<TooltipContentProps<number, string>> {
    mediaTypes: MediaType[];
}


function ActivityTooltip({ active, payload, label, mediaTypes }: ActivityTooltipProps) {
    if (!active || !payload?.length) return null;

    const rows = payload
        .filter((entry) => Number(entry.value) > 0)
        .sort((a, b) => Number(b.value) - Number(a.value));

    return (
        <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
            <p className="mb-2 font-medium">
                {formatMonthYear(String(label ?? ""), { month: "long" })}
            </p>

            {rows.length === 0 ?
                <p className="text-muted-foreground">
                    No activity.
                </p>
                :
                rows.map((entry) =>
                    <div key={String(entry.dataKey)} className="grid grid-cols-2 gap-6 space-y-1.5">
                        <span className="flex gap-1.5 items-center capitalize">
                            <MainThemeIcon type={String(entry.dataKey) as MediaType} size={14}/> {String(entry.dataKey)}:
                        </span>
                        <span className="text-right text-muted-foreground">
                            {formatNumber(Number(entry.value), { fractionDigits: 0 })} hours
                        </span>
                    </div>
                )}

            {mediaTypes.length > 1 && rows.length > 0 &&
                <p className="mt-1 border-t pt-1">
                    Total: {formatNumber(rows.reduce((s, e) => s + Number(e.value), 0), { fractionDigits: 0 })} hours
                </p>
            }
        </div>
    );
}
