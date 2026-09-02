import {cn} from "@/lib/utils/classnames";
import {ActivityPeriod} from "@/lib/schemas";


const START_YEAR = 2026;
const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


interface CalendarNavProps {
    activeYear: number;
    activeMonth: number;
    view: ActivityPeriod;
    onDateChange: (year: string, month: string, view: ActivityPeriod) => void;
}


export function CalendarNav({ onDateChange, activeMonth, activeYear, view }: CalendarNavProps) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const yearsList = Array.from({ length: currentYear - START_YEAR + 1 }, (_, i) => currentYear - i);

    const handleSelect = (year: number, month: number) => {
        onDateChange(String(year), String(month), "month");
    };

    const onYearChange = (year: number) => {
        const newMonth = isFuture(year, activeMonth - 1) ? currentMonth : activeMonth;
        onDateChange(String(year), String(newMonth), "year");
    };

    const isFuture = (year: number, monthIdx: number) => {
        const monthNum = monthIdx + 1;
        if (year > currentYear) return true;
        return year === currentYear && monthNum > currentMonth;
    };

    return (
        <nav
            aria-label="Activity period"
            className="flex min-w-0 items-stretch overflow-hidden rounded-xl py-2 border px-2 shadow-xs max-sm:flex-col"
        >
            <div className="scrollbar-thin flex max-w-full shrink-0 items-center gap-1 overflow-x-auto max-sm:w-full max-sm:border-b
            max-sm:pb-1.5 sm:max-w-64 sm:pr-3">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Year
                </span>
                {yearsList.map((year) => {
                    const active = activeYear === year;

                    return (
                        <button
                            key={year}
                            type="button"
                            onClick={() => onYearChange(year)}
                            aria-current={active && view === "year" ? "page" : undefined}
                            className={cn(
                                "h-6 shrink-0 rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors",
                                active ? "bg-background/70 text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                active && view === "year" && "bg-brand/10 text-brand shadow-xs",
                            )}
                        >
                            {year}
                        </button>
                    );
                })}
            </div>

            <div className="scrollbar-thin flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto max-sm:pt-1.5 sm:border-l sm:pl-3">
                {shortMonthNames.map((month, idx) => {
                    const monthIdx = idx + 1;
                    const disabled = isFuture(activeYear, idx);
                    const active = view === "month" && activeMonth === monthIdx;

                    return (
                        <button
                            key={month}
                            type="button"
                            disabled={disabled}
                            aria-label={`${month} ${activeYear}`}
                            aria-current={active ? "page" : undefined}
                            onClick={() => handleSelect(activeYear, monthIdx)}
                            className={cn(
                                "h-6 min-w-12 flex-1 shrink-0 rounded-lg px-2 text-xs font-medium transition-colors",
                                active ? "bg-background text-brand shadow-xs" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                disabled && "cursor-default opacity-20 hover:bg-transparent hover:text-muted-foreground",
                            )}
                        >
                            {month}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
