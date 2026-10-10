import {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {Field, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {authOptions} from "@/lib/client/react-query/query-options/auth.options";
import {CalendarClock, CalendarDays, ChevronLeft, ChevronRight} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {releaseCalendarOptions} from "@/lib/client/react-query/query-options/media.options";
import {ReleaseCalendarGrid} from "@/lib/client/components/release-calendar/ReleaseCalendarGrid";
import {getReleaseCalendarPeriod} from "@/lib/client/components/release-calendar/release-calendar.utils";
import {ReleaseCalendarSearch, releaseCalendarSearchSchema} from "@/lib/schemas/release-calendar.schema";
import {dateFromUTCInput, formatMonthYear, shiftDateInputValue, toDateInputValue} from "@/lib/utils/formatting/date";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_private/release-calendar")({
    validateSearch: releaseCalendarSearchSchema,
    loaderDeps: ({ search: { date, view } }) => ({
        date: date ?? toDateInputValue(new Date()), view: view ?? "month",
    }),
    loader: ({ context: { queryClient }, deps: { date, view } }) => {
        const currentUser = queryClient.getQueryData(authOptions.queryKey)!;
        const { startDate, endDate } = getReleaseCalendarPeriod(date, view);
        return queryClient.ensureQueryData(releaseCalendarOptions(currentUser.name, { startDate, endDate }));
    },
    component: ReleaseCalendarPage,
});


function ReleaseCalendarPage() {
    const { currentUser } = useAuth();
    const navigate = Route.useNavigate();
    const { mediaType } = Route.useSearch();
    const { date, view } = Route.useLoaderDeps();
    const [pickerOpen, setPickerOpen] = useState(false);
    const { startDate, endDate, days } = getReleaseCalendarPeriod(date, view);
    const { data } = useSuspenseQuery(releaseCalendarOptions(currentUser!.name, { startDate, endDate }));

    const currentMediaType = data.mediaTypes.find(type => type === mediaType) ?? "all";
    const mediaItems = createMediaSelectItems(data.mediaTypes, { leading: "all", leadingLabel: "All media" });
    const items = data.items.filter(item => currentMediaType === "all" || item.mediaType === currentMediaType);

    const today = toDateInputValue(new Date());
    const isMonth = view === "month";

    const periodLabel = isMonth ? formatMonthYear(date.slice(0, 7), { month: "long" })
        : `${dateFromUTCInput(startDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC"
        })} – ${dateFromUTCInput(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;

    const updateCalendar = (next: Partial<ReleaseCalendarSearch>) => {
        void navigate({ search: prev => ({ ...prev, date, view, ...next }), resetScroll: false });
    };

    const changePeriod = (direction: number) => {
        updateCalendar({
            date: isMonth
                ? shiftDateInputValue(`${date.slice(0, 7)}-01`, { months: direction })
                : shiftDateInputValue(date, { days: direction * 7 }),
        });
    };

    return (
        <PageTitle title="Release Calendar" onlyHelmet>
            <div className="flex flex-col gap-6 pt-6 pb-12 sm:pt-8">
                <PageHeader
                    title="Release Calendar"
                    eyebrow="From your lists"
                    eyebrowIcon={CalendarClock}
                    description="Explore release dates for your movies, games and next episodes."
                />

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    aria-label={`Previous ${view}`}
                                    onClick={() => changePeriod(-1)}
                                >
                                    <ChevronLeft/>
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    aria-label={`Next ${view}`}
                                    onClick={() => changePeriod(1)}
                                >
                                    <ChevronRight/>
                                </Button>
                            </div>
                            <Button variant="outline" onClick={() => updateCalendar({ date: today })}>
                                Today
                            </Button>
                            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                                <PopoverTrigger render={<Button variant="ghost" aria-label="Choose month"/>}>
                                    {periodLabel}<CalendarDays data-icon="inline-end"/>
                                </PopoverTrigger>

                                <PopoverContent align="start" className="w-64">
                                    <form
                                        onSubmit={ev => {
                                            ev.preventDefault();
                                            const month = new FormData(ev.currentTarget).get("month") as string;
                                            updateCalendar({ date: `${month}-01` });
                                            setPickerOpen(false);
                                        }}
                                    >
                                        <FieldGroup className="gap-3">
                                            <Field>
                                                <FieldLabel htmlFor="release-month">
                                                    Jump to a month
                                                </FieldLabel>
                                                <Input
                                                    required
                                                    name="month"
                                                    type="month"
                                                    id="release-month"
                                                    defaultValue={date.slice(0, 7)}
                                                />
                                            </Field>
                                            <Button type="submit" variant="outline">
                                                Go to month
                                            </Button>
                                        </FieldGroup>
                                    </form>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                items={mediaItems}
                                value={currentMediaType}
                                onValueChange={value => updateCalendar({
                                    mediaType: value === "all"
                                        ? undefined
                                        : value as ReleaseCalendarSearch["mediaType"]
                                })}
                            >
                                <SelectTrigger className="min-w-36" aria-label="Filter by media type">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {mediaItems.map(item =>
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>)}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <ToggleGroup
                                spacing={0}
                                value={[view]}
                                variant="outline"
                                aria-label="Calendar view"
                                onValueChange={value => {
                                    if (value[0]) updateCalendar({ view: value[0] as NonNullable<ReleaseCalendarSearch["view"]> });
                                }}
                            >
                                <ToggleGroupItem value="month" aria-label="Month view">
                                    Month
                                </ToggleGroupItem>
                                <ToggleGroupItem value="week" aria-label="Week view">
                                    Week
                                </ToggleGroupItem>
                            </ToggleGroup>
                            <InfoPopover label="About the release calendar" title="Which releases are shown?" align="end">
                                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                                    <p>Releases come from media in your lists with a known date. Dropped media are excluded.</p>
                                    <p>Movies and games include past and future releases.</p>
                                    <p>
                                        Series and anime show only the next known episode for each title.
                                        Past episodes and full episode schedules are not available.
                                    </p>
                                </div>
                            </InfoPopover>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground" aria-live="polite">
                        <h2 className="font-medium">
                            {periodLabel}
                        </h2>
                        <span>
                            {items.length} {items.length === 1 ? "release" : "releases"}
                        </span>
                    </div>

                    <ReleaseCalendarGrid
                        date={date}
                        view={view}
                        days={days}
                        today={today}
                        items={items}
                        key={`${date}-${view}-${currentMediaType}`}
                        onWeekSelect={date => updateCalendar({ date, view: "week" })}
                    />
                </div>
            </div>
        </PageTitle>
    );
}
