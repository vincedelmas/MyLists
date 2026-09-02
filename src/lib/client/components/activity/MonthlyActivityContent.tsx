import {useState} from "react";
import {MonthlyActivitySearch} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Label} from "@/lib/client/components/ui/label";
import {useSuspenseQuery} from "@tanstack/react-query";
import {CalendarDays, History, LayoutGrid, Plus} from "lucide-react";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {ActivityKind, MediaType} from "@/lib/utils/enums";
import {formatMinutes, formatNumber} from "@/lib/utils/number-formatting";
import {formatMonth, formatMonthYear} from "@/lib/utils/date-formatting";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {CalendarNav} from "@/lib/client/components/activity/CalendarNav";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {MediaCardEditAction} from "@/lib/client/components/media/base/MediaCardEditAction";
import {MonthlyActivityStats} from "@/lib/client/components/activity/MonthlyActivityStats";
import {MonthlyActivityEditor, MonthlyActivityOccurrence} from "@/lib/types/activity.types";
import {MonthlyActivityAddDialog} from "@/lib/client/components/activity/MonthlyActivityAddDialog";
import {MonthlyActivityEditDialog} from "@/lib/client/components/activity/MonthlyActivityEditDialog";
import {MonthlyActivityStatusIcons} from "@/lib/client/components/activity/MonthlyActivityStatusIcons";
import {monthlyActivityOptions, monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";
import {YearlyActivityOccurrencesDialog} from "@/lib/client/components/activity/YearlyActivityOccurrencesDialog";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardRightCorner, MediaCardSignals, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


const activityKindFilters: { label: string, value: ActivityKind }[] = [
    { label: "All summaries", value: ActivityKind.ALL },
    { label: "Completed", value: ActivityKind.COMPLETED },
    { label: "Progressed", value: ActivityKind.PROGRESSED },
    { label: "Re-experienced", value: ActivityKind.REDO },
];


interface MonthlyActivityContentProps {
    username: string;
    fixedMediaType?: MediaType;
    filters: MonthlyActivitySearch;
    activityQueryOptions: ReturnType<typeof monthlyActivityOptions>;
    activityStatsQueryOptions: ReturnType<typeof monthlyActivityStatsOptions>;
}


export function MonthlyActivityContent(props: MonthlyActivityContentProps) {
    const { username, filters, fixedMediaType, activityQueryOptions, activityStatsQueryOptions } = props;

    const { currentUser } = useAuth();
    const canEdit = currentUser?.name === username;
    const [addActivity, setAddActivity] = useState(false);
    const activeFilters = fixedMediaType ? { ...filters, activeTab: fixedMediaType } : filters;
    const [editActivity, setEditActivity] = useState<MonthlyActivityEditor | null>(null);
    const [occurrencesActivity, setOccurrencesActivity] = useState<MonthlyActivityEditor | null>(null);

    const apiData = useSuspenseQuery(activityQueryOptions).data;
    const activityStats = useSuspenseQuery(activityStatsQueryOptions).data;
    const mediaTypeFilters = createMediaSelectItems(apiData.mediaTypes, { leading: "all", leadingLabel: "All types" });

    const {
        page = 1,
        search = "",
        view = "month",
        activeTab = "all",
        hiddenOnly = false,
        activityKind = ActivityKind.ALL,
        ...dateFilters
    } = activeFilters;

    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<MonthlyActivitySearch>({
        search, options: { resetScroll: false },
    });

    const activeMediaTypes = fixedMediaType ? [fixedMediaType] : currentUser
        ? getActiveMediaTypes(currentUser.settings)
        : apiData.mediaTypes;

    const handleFilterChange = (next: Partial<MonthlyActivitySearch>) => {
        updateFilters({ page: 1, ...next, ...(fixedMediaType ? { activeTab: fixedMediaType } : {}) });
    };

    const handleOccurrenceSelect = (occurrence: MonthlyActivityOccurrence) => {
        const [year, month] = occurrence.monthBucket.split("-");
        setOccurrencesActivity(null);
        handleFilterChange({ year, month, view: "month" });
    };

    const periodLabel = view === "year"
        ? dateFilters.year
        : `${formatMonth(dateFilters.month)} ${dateFilters.year}`;

    const calendarNavigation = (
        <CalendarNav
            view={view}
            activeYear={Number(dateFilters.year)}
            activeMonth={Number(dateFilters.month)}
            onDateChange={(year, month, nextView) => handleFilterChange({ year, month, view: nextView, activeTab: fixedMediaType ?? "all" })}
        />
    );

    const activityContent = (
        <>
            <MonthlyActivityStats
                stats={activityStats}
                showTotalTime={!fixedMediaType}
            />

            <section className="pt-6">
                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput
                        value={localSearch}
                        onChange={handleInputChange}
                        aria-label="Search recorded activity"
                        className="w-full lg:max-w-md lg:flex-1"
                        placeholder={view === "year"
                            ? `Search ${dateFilters.year} activity by title...`
                            : "Search monthly activity by title..."
                        }
                    />

                    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center lg:ml-auto lg:flex-nowrap">
                        <Select
                            value={activityKind}
                            items={activityKindFilters}
                            onValueChange={(value) => {
                                if (value !== null) handleFilterChange({ activityKind: value as ActivityKind });
                            }}
                        >
                            <SelectTrigger aria-label="Filter by activity kind" className="w-full sm:w-42">
                                <SelectValue placeholder="Activity kind"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {activityKindFilters.map((filter) =>
                                        <SelectItem key={filter.value} value={filter.value}>
                                            {filter.label}
                                        </SelectItem>
                                    )}
                                </SelectGroup>
                            </SelectContent>
                        </Select>

                        {!fixedMediaType &&
                            <Select
                                value={activeTab}
                                items={mediaTypeFilters}
                                onValueChange={(value) => {
                                    if (value !== null) handleFilterChange({ activeTab: value as MediaType | "all" });
                                }}
                            >
                                <SelectTrigger aria-label="Filter by media type" className="w-full sm:w-38">
                                    <SelectValue placeholder="Media type"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {mediaTypeFilters.map((filter) =>
                                            <SelectItem key={filter.value} value={filter.value}>
                                                {filter.label}
                                            </SelectItem>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        }

                        {canEdit &&
                            <Button className="w-full sm:w-auto" onClick={() => setAddActivity(true)}>
                                <Plus/> Add activity
                            </Button>
                        }

                        {canEdit &&
                            <div className="flex min-h-9 items-center gap-2 max-sm:px-1">
                                <Switch
                                    id="hidden-only"
                                    checked={hiddenOnly}
                                    onCheckedChange={(checked) => handleFilterChange({ hiddenOnly: checked })}
                                />
                                <Label htmlFor="hidden-only" className="whitespace-nowrap text-sm">
                                    Hidden only
                                </Label>
                            </div>
                        }
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Recorded activity
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
                        <span>
                            {formatNumber(apiData.total)} media
                        </span>
                        {apiData.pages > 1 &&
                            <>
                                <span aria-hidden="true">·</span>
                                <span>Page {page} / {apiData.pages}</span>
                            </>
                        }
                    </div>
                </div>

                {apiData.items.length === 0 &&
                    <EmptyState
                        iconSize={44}
                        icon={LayoutGrid}
                        className="mt-5 min-h-64 rounded-xl border shadow-xs"
                        message={hiddenOnly
                            ? `No hidden ${view === "year" ? "yearly" : "monthly"} activity.`
                            : `No activity recorded ${view === "year" ? "this year" : "this month"}.`
                        }
                    />
                }

                {apiData.items.length > 0 &&
                    <div className="grid grid-cols-2 gap-4 pt-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {apiData.items.map((row) =>
                            <MediaCard key={row.id} mediaType={row.mediaType} item={{ ...row, mediaCover: row.mediaCover }}>
                                {view === "month" && canEdit &&
                                    <MediaCardRightCorner>
                                        <MediaCardEditAction
                                            onClick={() => setEditActivity(row)}
                                            label={`Edit Monthly Activity for ${row.mediaName}`}
                                        />
                                    </MediaCardRightCorner>
                                }
                                {view === "year" && row.occurrences && row.occurrences.length > 1 &&
                                    <MediaCardRightCorner>
                                        <Button
                                            size="bare"
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setOccurrencesActivity(row)}
                                            title={`View yearly activity for ${row.mediaName}`}
                                            aria-label={`View yearly activity for ${row.mediaName}`}
                                        >
                                            <History data-icon="inline-start"/>
                                        </Button>
                                    </MediaCardRightCorner>
                                }

                                <MediaCardFooter>
                                    <MediaCardTitle title={row.mediaName}>
                                        {row.mediaName}
                                    </MediaCardTitle>
                                    <MediaCardMeta>
                                        <MediaCardDetails>
                                            {(!fixedMediaType && activeTab === "all") &&
                                                <span className="flex min-w-0 items-center gap-1 capitalize">
                                                    <MediaTypeIcon mediaType={row.mediaType}/>
                                                    {view === "month" &&
                                                        <span className="truncate">
                                                            {row.mediaType}
                                                        </span>
                                                    }
                                                </span>
                                            }
                                            {formatMinutes(row.timeGained)}
                                            {view === "year" && row.occurrences?.length === 1 &&
                                                <span>
                                                    {formatMonthYear(row.lastActivityAt, { month: "short" })}
                                                </span>
                                            }
                                        </MediaCardDetails>
                                        <MediaCardSignals>
                                            <MonthlyActivityStatusIcons row={row}/>
                                        </MediaCardSignals>
                                    </MediaCardMeta>
                                </MediaCardFooter>
                            </MediaCard>
                        )}
                    </div>
                }

                <Pagination
                    currentPage={page}
                    totalPages={apiData.pages}
                    onChangePage={(nextPage) => updateFilters({ page: nextPage, ...(fixedMediaType ? { activeTab: fixedMediaType } : {}) })}
                />
            </section>

            {editActivity &&
                <MonthlyActivityEditDialog
                    activity={editActivity}
                    open={Boolean(editActivity)}
                    onOpenChange={() => setEditActivity(null)}
                />
            }

            {addActivity &&
                <MonthlyActivityAddDialog
                    open
                    onOpenChange={setAddActivity}
                    mediaTypes={activeMediaTypes}
                    year={Number(dateFilters.year)}
                    month={view === "year" ? undefined : Number(dateFilters.month)}
                />
            }

            {occurrencesActivity &&
                <YearlyActivityOccurrencesDialog
                    open
                    activity={occurrencesActivity}
                    onSelect={handleOccurrenceSelect}
                    onOpenChange={() => setOccurrencesActivity(null)}
                />
            }
        </>
    );

    if (fixedMediaType) {
        return (
            <div className="pt-6">
                {calendarNavigation}
                {activityContent}
            </div>
        );
    }

    return (
        <PageTitle title={`${periodLabel} activity for ${username}`} onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    eyebrow="Month by month"
                    asideIcon={CalendarDays}
                    asideValue={periodLabel}
                    eyebrowIcon={CalendarDays}
                    asideLabel="Current period"
                    navigation={calendarNavigation}
                    title={`${username}'s activity`}
                    description={`See what ${username} watched, read, played, month by month.`}
                />

                {activityContent}
            </div>
        </PageTitle>
    );
}
