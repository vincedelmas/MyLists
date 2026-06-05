import {useMemo} from "react";
import {cn} from "@/lib/utils/classnames";


interface CalendarNavProps {
    activeYear: number;
    activeMonth: number;
    onDateChange: (year: string, month: string) => void;
}


const START_YEAR = 2026;
const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


export function CalendarNav({ onDateChange, activeMonth, activeYear }: CalendarNavProps) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const yearsList = useMemo(() => {
        const yrs = [];
        for (let y = START_YEAR; y <= currentYear; y += 1) {
            yrs.push(y);
        }
        return yrs;
    }, [currentYear]);

    const handleSelect = (year: number, month: number) => {
        onDateChange(String(year), String(month));
    };

    const onYearChange = (year: number) => {
        const newMonth = isFuture(year, activeMonth - 1) ? currentMonth : activeMonth;
        onDateChange(String(year), String(newMonth));
    }

    const isFuture = (year: number, monthIdx: number) => {
        const monthNum = monthIdx + 1;
        if (year > currentYear) return true;
        return year === currentYear && monthNum > currentMonth;
    };

    return (
        <div className="max-w-140 rounded-lg border border-border p-2 max-sm:w-full">
            <div className="flex flex-wrap gap-1 border-b border-border mb-2 pb-2">
                {yearsList.map((year) =>
                    <button
                        key={year}
                        onClick={() => onYearChange(year)}
                        className={cn("cursor-pointer rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors",
                            activeYear === year
                                ? "bg-app-accent text-background"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        {year}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-12 gap-1 max-sm:grid-cols-6">
                {shortMonthNames.map((month, idx) => {
                    const monthIdx = idx + 1;
                    const active = (activeMonth === monthIdx);
                    const disabled = isFuture(activeYear, idx);

                    return (
                        <button
                            key={month}
                            disabled={disabled}
                            onClick={() => handleSelect(activeYear, monthIdx)}
                            className={cn("flex h-7 items-center justify-center rounded text-[11px] font-medium transition-all",
                                active
                                    ? "bg-app-accent/20 text-app-accent ring-1 ring-app-accent/50"
                                    : disabled
                                        ? "cursor-default opacity-20"
                                        : "cursor-pointer text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            {month}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
