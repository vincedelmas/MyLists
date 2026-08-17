import {formatHours} from "@/lib/utils/number-formatting";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import type {YearRecapMonth} from "@/lib/types/year-recap.types";


interface YearRecapTimelineProps {
    color: string;
    months: YearRecapMonth[];
}


export function YearRecapTimeline({ months, color }: YearRecapTimelineProps) {
    const maximum = Math.max(...months.map((month) => month.hours), 0);

    return (
        <div className="scrollbar-thin overflow-x-auto rounded-xl border bg-card/40 px-4 pb-5 pt-7 sm:px-6">
            <div className="flex min-w-150 items-end gap-2">
                {months.map((month) => {
                    const height = maximum > 0 ? (month.hours / maximum) * 100 : 0;

                    return (
                        <div key={month.month} className="group flex min-w-0 flex-1 flex-col items-center">
                            <div className="relative flex h-44 w-full items-end justify-center border-b">
                                <div
                                    className="w-[68%] min-w-3 opacity-80 transition-all group-hover:w-[80%] group-hover:opacity-100"
                                    style={{
                                        backgroundColor: color,
                                        height: `${Math.max(month.hours > 0 ? 5 : 1, height)}%`,
                                    }}
                                />
                                <div className="pointer-events-none absolute -top-3 left-1/2 z-10 hidden w-36 -translate-x-1/2
                                rounded-md border bg-popover p-2 text-center text-[10px] shadow-xl group-hover:block">
                                    <div className="font-semibold">
                                        {formatMonthYear(month.month, { month: "long" })}
                                    </div>
                                    <div className="mt-1 text-muted-foreground">
                                        {formatHours(month.hours)} · {month.titleCount} titles
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
