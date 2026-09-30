import {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {CalendarDays} from "lucide-react";
import {formatDate} from "@/lib/utils/formatting/date";
import {Button} from "@/lib/client/components/ui/button";
import {ReleaseCalendarItem} from "@/lib/types/release-calendar.types";
import {ReleaseCalendarSearch} from "@/lib/schemas/release-calendar.schema";
import {ReleaseCalendarEvent} from "@/lib/client/components/release-calendar/ReleaseCalendarEvent";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];


interface ReleaseCalendarGridProps {
    date: string;
    today: string;
    days: string[];
    items: ReleaseCalendarItem[];
    onWeekSelect: (date: string) => void;
    view: NonNullable<ReleaseCalendarSearch["view"]>;
}


export function ReleaseCalendarGrid({ days, date, today, items, view, onWeekSelect }: ReleaseCalendarGridProps) {
    const isMonth = view === "month";
    const itemsByDay = new Map<string, ReleaseCalendarItem[]>();
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    for (const item of items) {
        const dayItems = itemsByDay.get(item.date) ?? [];
        dayItems.push(item);
        itemsByDay.set(item.date, dayItems);
    }

    const selectedItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];
    const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));

    return (
        <>
            <div
                role="table"
                className="overflow-hidden rounded-xl border shadow-xs"
                aria-label={`${view === "month" ? "Monthly" : "Weekly"} release calendar`}
            >
                <div role="row" className={cn("grid grid-cols-7 border-b bg-muted/35", !isMonth && "max-md:hidden")}>
                    {WEEKDAYS.map(day =>
                        <div
                            key={day}
                            aria-label={day}
                            role="columnheader"
                            className="py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                        >
                            <span aria-hidden="true" className="sm:hidden">
                                {day.slice(0, 1)}
                            </span>
                            <span aria-hidden="true" className="hidden sm:inline">
                                {day.slice(0, 3)}
                            </span>
                        </div>,
                    )}
                </div>
                {weeks.map(week =>
                    <div key={week[0]} role="row" className={cn("grid", isMonth
                        ? "grid-cols-7 last:[&>div]:border-b-0"
                        : "grid-cols-1 md:grid-cols-7 md:[&>div]:border-b-0 [&>div:last-child]:border-b-0",
                    )}>
                        {week.map((day, index) => {
                            const releases = itemsByDay.get(day) ?? [];
                            const outsideMonth = isMonth && day.slice(0, 7) !== date.slice(0, 7);
                            const isToday = day === today;

                            return (
                                <div
                                    key={day}
                                    role="cell"
                                    aria-label={formatDate(day)}
                                    className={cn("flex min-w-0 flex-col gap-2 border-r border-b p-1.5 last:border-r-0 sm:p-2",
                                        isMonth ? "min-h-24 md:min-h-32" : "p-3 max-md:border-r-0 md:min-h-96",
                                        outsideMonth && "bg-muted/25",
                                        isToday && "bg-brand/5",
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDay(day)}
                                            aria-label={`View releases for ${formatDate(day)}`}
                                            className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs " +
                                                "font-semibold tabular-nums transition-colors hover:bg-muted focus-visible:outline-none " +
                                                "focus-visible:ring-2 focus-visible:ring-brand/40",
                                                outsideMonth && "text-muted-foreground",
                                                isToday && "bg-brand/15 text-brand ring-1 ring-brand/30 hover:bg-brand/25",
                                            )}
                                        >
                                            <time dateTime={day} aria-current={isToday ? "date" : undefined}>
                                                {Number(day.slice(-2))}
                                            </time>
                                        </button>

                                        {!isMonth &&
                                            <span className="text-xs text-muted-foreground md:hidden">
                                                {WEEKDAYS[index]} · {formatDate(day)}
                                            </span>
                                        }

                                        {isMonth && releases.length > 0 &&
                                            <span className="hidden text-[10px] tabular-nums text-muted-foreground md:inline">
                                                {releases.length}
                                            </span>
                                        }
                                    </div>
                                    {isMonth && releases.length > 0 &&
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDay(day)}
                                            aria-label={`${releases.length} ${releases.length === 1 ? "release" : "releases"} on ${formatDate(day)}`}
                                            className="flex min-h-8 flex-col items-center gap-1 rounded-md text-xs font-semibold
                                            text-brand transition-colors hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2
                                            focus-visible:ring-brand/40 md:hidden"
                                        >
                                            <span>{releases.length}</span>
                                            <span
                                                aria-hidden="true"
                                                className="size-1 rounded-full bg-brand"
                                            />
                                        </button>
                                    }
                                    <div className={cn("flex flex-col gap-1.5", isMonth && "max-md:hidden")}>
                                        {(isMonth ? releases.slice(0, 3) : releases).map(item =>
                                            <ReleaseCalendarEvent
                                                item={item}
                                                compact={isMonth}
                                                key={`${item.mediaType}-${item.mediaId}`}
                                            />,
                                        )}

                                        {isMonth && releases.length > 3 &&
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => setSelectedDay(day)}
                                                aria-label={`View all ${releases.length} releases on ${formatDate(day)}`}
                                            >
                                                +{releases.length - 3} more
                                            </Button>
                                        }

                                        {!isMonth && releases.length === 0 &&
                                            <span className="py-2 text-center text-xs text-muted-foreground">
                                                No releases
                                            </span>
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>,
                )}
            </div>

            <Dialog
                open={selectedDay !== null}
                onOpenChange={open => {
                    if (!open) setSelectedDay(null);
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedDay ? formatDate(selectedDay) : "Releases"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedItems.length === 0
                                ? "No releases from your lists on this day."
                                : `${selectedItems.length} ${selectedItems.length === 1 ? "release" : "releases"} from your lists.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    {selectedItems.length > 0 &&
                        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-1">
                            {selectedItems.map(item =>
                                <ReleaseCalendarEvent
                                    item={item}
                                    key={`${item.mediaType}-${item.mediaId}`}
                                />
                            )}
                        </div>
                    }
                    {isMonth &&
                        <DialogFooter>
                            <Button variant="outline" onClick={() => onWeekSelect(selectedDay!)}>
                                <CalendarDays data-icon="inline-start"/> View this week
                            </Button>
                        </DialogFooter>
                    }
                </DialogContent>
            </Dialog>
        </>
    );
}
