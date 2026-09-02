import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {MonthlyActivityChartDatum} from "@/lib/types/activity.types";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {formatHours, formatNumber} from "@/lib/utils/number-formatting";


interface ActivityTapestryProps {
    mediaTypes: MediaType[];
    data: MonthlyActivityChartDatum[];
}


export function ActivityTapestry({ data, mediaTypes }: ActivityTapestryProps) {
    const visibleMediaTypes = mediaTypes.filter((mt) => data.some((month) => Number(month[mt]) > 0));
    const rows = visibleMediaTypes.length > 0 ? visibleMediaTypes : mediaTypes;

    return (
        <div className="scrollbar-thin h-fit overflow-x-auto rounded-xl border p-4 shadow-xs sm:p-5">
            <div className="min-w-180">
                <div
                    className="grid items-center gap-2"
                    style={{ gridTemplateColumns: `110px repeat(${data.length}, minmax(30px, 1fr)) 72px` }}
                >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Media
                    </div>
                    {data.map(({ month }) =>
                        <div key={month} className="text-center text-[10px] font-medium text-muted-foreground">
                            {formatMonthYear(month).split(" ")[0]}
                        </div>
                    )}
                    <div className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Total
                    </div>

                    {rows.flatMap((mediaType) => {
                        const values = data.map((month) => Number(month[mediaType]) || 0);
                        const maximum = Math.max(...values, 0);

                        const color = getThemeColor(mediaType);
                        const total = values.reduce((sum, value) => sum + value, 0);

                        return [
                            <div key={`${mediaType}-label`} className="flex items-center gap-2 py-1 text-xs font-medium capitalize">
                                <MainThemeIcon type={mediaType} size={14}/>
                                {mediaType}
                            </div>,
                            ...values.map((value, index) => {
                                const intensity = maximum > 0 ? value / maximum : 0;

                                return (
                                    <div
                                        key={`${mediaType}-${data[index].month}`}
                                        title={`${formatMonthYear(data[index].month)}: ${formatNumber(value, { fractionDigits: 1 })} hours`}
                                        className="mx-auto size-8 rounded-sm ring-1 ring-inset ring-foreground/5
                                        transition-transform hover:scale-110 sm:size-10"
                                        style={{
                                            background: value > 0
                                                ? `color-mix(in oklch, ${color} ${Math.round(28 + intensity * 68)}%, var(--popover))`
                                                : "var(--muted)",
                                        }}
                                    />
                                );
                            }),
                            <div key={`${mediaType}-total`} className="text-right text-xs font-semibold tabular-nums">
                                {formatHours(total)}
                            </div>,
                        ];
                    })}
                </div>
            </div>
        </div>
    );
}
