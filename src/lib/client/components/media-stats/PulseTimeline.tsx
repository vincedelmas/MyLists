import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatHours} from "@/lib/utils/number-formatting";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {MonthlyActivityChartDatum} from "@/lib/types/activity.types";


interface PulseTimelineProps {
    mediaType: MediaType;
    activity: MonthlyActivityChartDatum[];
}


export function PulseTimeline({ mediaType, activity }: PulseTimelineProps) {
    const color = getThemeColor(mediaType);
    const maxHours = Math.max(...activity.map(({ total }) => total), 0);

    return (
        <div className="scrollbar-thin overflow-x-auto rounded-xl border px-4 pb-5 pt-7 sm:px-7">
            <div className="flex min-w-170 items-end gap-2">
                {activity.map((month) => {
                    const height = maxHours > 0 ? (month.total / maxHours) * 100 : 0;

                    return (
                        <div key={month.month} className="group flex min-w-0 flex-1 flex-col items-center">
                            <div className="relative flex h-52 w-full items-end justify-center border-b">
                                <div
                                    className="w-[70%] min-w-4 opacity-80 transition-all duration-300 group-hover:w-[82%] g
                                    roup-hover:opacity-100"
                                    style={{
                                        backgroundColor: color,
                                        height: `${Math.max(month.total > 0 ? 5 : 1, height)}%`,
                                    }}
                                />
                                <div
                                    className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden w-36 -translate-x-1/2
                                    rounded-md border bg-popover p-2 text-center text-[10px] shadow-xl group-hover:block">
                                    <div className="font-semibold">
                                        {formatMonthYear(month.month, { month: "long" })}
                                    </div>
                                    <div className="mt-1 text-muted-foreground">
                                        {formatHours(month.total)} tracked
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 text-[10px] font-medium text-muted-foreground">
                                {formatMonthYear(month.month).split(" ")[0]}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
