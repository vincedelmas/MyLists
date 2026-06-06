import {useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {Button} from "@/lib/client/components/ui/button";
import {Calendar} from "@/lib/client/components/ui/calendar";
import {Calendar as CalendarIcon, TriangleAlert} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {dateInputValueToDate, formatDate, shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";


interface BacklogModeBannerProps {
    date: string;
    enabled: boolean;
    disabled: boolean;
    onDateChange: (date: string) => void;
    onEnabledChange: (enabled: boolean) => void;
}


export const BacklogModeSystem = ({ date, onDateChange, onEnabledChange, disabled, enabled }: BacklogModeBannerProps) => {
    const todayCalendar = toDateInputValue(new Date());
    const todayDate = dateInputValueToDate(todayCalendar);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const selectedLabel = enabled && date ? formatDate(date) : "TODAY";
    const selectedDate = dateInputValueToDate(enabled && date ? date : todayCalendar);
    const calendarStartDate = new Date(todayDate.getFullYear() - 20, 0, 1);

    const presets = [
        { label: "Today", value: todayCalendar, enabled: false },
        { label: "-2d", value: shiftDateInputValue(todayCalendar, { days: -2 }), enabled: true },
        { label: "-1 wk.", value: shiftDateInputValue(todayCalendar, { days: -7 }), enabled: true },
        { label: "-1 mo.", value: shiftDateInputValue(todayCalendar, { months: -1 }), enabled: true },
    ];

    const selectDate = (value: string, shouldEnable: boolean) => {
        onDateChange(shouldEnable ? value : "");
        onEnabledChange(shouldEnable);
    };

    const handleCustomDate = (value: string) => {
        const isToday = value === todayCalendar;
        onDateChange(isToday ? "" : value);
        onEnabledChange(!!value && !isToday);
    };

    const handleCalendarSelect = (selected?: Date) => {
        if (!selected) return;
        handleCustomDate(toDateInputValue(selected));
        setCalendarOpen(false);
    };

    return (
        <div className="-mt-1 mb-5 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Log for:{" "}
                <span className="text-app-accent">
                    {selectedLabel}
                </span>
            </div>

            <div className="relative grid w-full grid-cols-5 gap-1.5">
                {presets.map((preset) => {
                    const isSelected = preset.enabled ? enabled && date === preset.value : !enabled;

                    return (
                        <Button
                            size="sm"
                            key={preset.label}
                            disabled={disabled}
                            variant={isSelected ? "default" : "secondary"}
                            onClick={() => selectDate(preset.value, preset.enabled)}
                            className={cn("h-7 w-full text-xs", isSelected
                                ? "bg-app-accent text-black hover:bg-app-accent/90"
                                : "bg-background text-muted-foreground hover:bg-background/80",
                            )}
                        >
                            {preset.label}
                        </Button>
                    );
                })}

                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            size="icon"
                            disabled={disabled}
                            variant="secondary"
                            title="Choose backlog date"
                            className="h-7 w-full bg-background text-muted-foreground hover:bg-background/80"
                        >
                            <CalendarIcon className="size-4"/>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto p-0">
                        <Calendar
                            mode="single"
                            fixedWeeks
                            endMonth={todayDate}
                            selected={selectedDate}
                            captionLayout="dropdown"
                            startMonth={calendarStartDate}
                            disabled={{ after: todayDate }}
                            onSelect={handleCalendarSelect}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            {selectedLabel !== "TODAY" &&
                <div className="pt-0.5 flex justify-center items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-app-rating">
                    <TriangleAlert className="size-4"/>
                    You are backlogging
                    <TriangleAlert className="size-4"/>
                </div>
            }
        </div>
    );
};
