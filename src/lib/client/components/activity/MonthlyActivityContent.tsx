import {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Label} from "@/lib/client/components/ui/label";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {ActivityKind, MediaType} from "@/lib/utils/enums";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {getActiveMediaTypes} from "@/lib/utils/media/list-activation";
import type {ActivitySort, MonthlyActivitySearch} from "@/lib/schemas";
import {CalendarDays, History, LayoutGrid, Plus} from "lucide-react";
import {CalendarNav} from "@/lib/client/components/activity/CalendarNav";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {formatMonth, formatMonthYear} from "@/lib/utils/formatting/date";
import {formatMinutes, formatNumber} from "@/lib/utils/formatting/number";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {MediaCardEditAction} from "@/lib/client/components/media/base/MediaCardEditAction";
import {MonthlyActivityStats} from "@/lib/client/components/activity/MonthlyActivityStats";
import {MonthlyActivityTable} from "@/lib/client/components/activity/MonthlyActivityTable";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";
import type {MonthlyActivityEditor, MonthlyActivityOccurrence} from "@/lib/types/activity.types";
import {MonthlyActivityAddDialog} from "@/lib/client/components/activity/MonthlyActivityAddDialog";
import {BrowseAppliedFilters} from "@/lib/client/components/media/browse/AppliedFilters";
import {MonthlyActivityEditDialog} from "@/lib/client/components/activity/MonthlyActivityEditDialog";
import {MonthlyActivityStatusIcons} from "@/lib/client/components/activity/MonthlyActivityStatusIcons";
import {monthlyActivityOptions, monthlyActivityStatsOptions} from "@/lib/client/react-query/query-options";
import {YearlyActivityOccurrencesDialog} from "@/lib/client/components/activity/YearlyActivityOccurrencesDialog";
import {
    MediaCard,
    MediaCardDetails,
    MediaCardFooter,
    MediaCardLeftCorner,
    MediaCardMeta,
    MediaCardRightCorner,
    MediaCardSignals,
    MediaCardTitle
} from "@/lib/client/components/media/base/MediaCard";


const activityKindFilters: { label: string, value: ActivityKind }[] = [
    { label: "All summaries", value: ActivityKind.ALL },
    { label: "Completed", value: ActivityKind.COMPLETED },
    { label: "Progressed", value: ActivityKind.PROGRESSED },
    { label: "Re-experienced", value: ActivityKind.REDO },
];


const activitySortItems: { label: string, value: ActivitySort }[] = [
    { label: "Latest activity", value: "latest" },
    { label: "Oldest activity", value: "oldest" },
    { label: MEDIA_SORT_DEFINITIONS.title_asc.label, value: "title_asc" },
    { label: MEDIA_SORT_DEFINITIONS.title_desc.label, value: "title_desc" },
    { label: "Most time", value: "time_desc" },
    { label: "Least time", value: "time_asc" },
];


interface MonthlyActivityContentProps {
    username: string;
    filters: MonthlyActivitySearch;
    activityQueryOptions: ReturnType<typeof monthlyActivityOptions>;
    activityStatsQueryOptions: ReturnType<typeof monthlyActivityStatsOptions>;
}


export function MonthlyActivityContent(props: MonthlyActivityContentProps) {
    const { username, filters, activityQueryOptions, activityStatsQueryOptions } = props;

    const { currentUser } = useAuth();
    const canEdit = currentUser?.name === username;
    const [addActivity, setAddActivity] = useState(false);
    const [editActivity, setEditActivity] = useState<MonthlyActivityEditor | null>(null);
    const [occurrencesActivity, setOccurrencesActivity] = useState<MonthlyActivityEditor | null>(null);

    const apiData = useSuspenseQuery(activityQueryOptions).data;
    const activityStats = useSuspenseQuery(activityStatsQueryOptions).data;
    const mediaTypeFilters = createMediaSelectItems(apiData.mediaTypes, { leading: "all", leadingLabel: "All types" });

    const { page, view, display, sort, activeTab, hiddenOnly, activityKind, year, month, search = "" } = filters;
    const hasFilters = search !== "" || activityKind !== ActivityKind.ALL || hiddenOnly || activeTab !== "all";

    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<MonthlyActivitySearch>({
        search, options: { resetScroll: false },
    });

    const activeMediaTypes = currentUser
        ? getActiveMediaTypes(currentUser.settings)
        : apiData.mediaTypes;

    const handleFilterChange = (next: Partial<MonthlyActivitySearch>) => {
        updateFilters({ page: 1, ...next });
    };

    const handleOccurrenceSelect = (occurrence: MonthlyActivityOccurrence) => {
        const [year, month] = occurrence.monthBucket.split("-");
        setOccurrencesActivity(null);
        handleFilterChange({ year, month, view: "month" });
    };

    const periodLabel = view === "year"
        ? year
        : `${formatMonth(month)} ${year}`;

    const calendarNavigation = (
        <CalendarNav
            view={view}
            activeYear={Number(year)}
            activeMonth={Number(month)}
            onDateChange={(year, month, nextView) => handleFilterChange({
                year, month, view: nextView, activeTab: "all",
            })}
        />
    );

    const activityContent = (
        <>
            <MonthlyActivityStats
                stats={activityStats}
            />
            {hasFilters &&
                <p className="pt-3 text-xs text-muted-foreground">
                    Stats cover all visible media activity in this period.
                    Filters apply to the results below.
                </p>
            }

            <section className="pt-6">
                <MediaBrowseToolbar
                    search={localSearch}
                    isGrid={display === "grid"}
                    onSearchChange={handleInputChange}
                    searchLabel="Search recorded activity"
                    onGridClick={() => updateFilters({ display: display === "grid" ? "table" : "grid" })}
                    searchPlaceholder={view === "year"
                        ? `Search ${year} activity by title...`
                        : "Search monthly activity by title..."
                    }
                    selects={[
                        {
                            key: "kind",
                            value: activityKind,
                            items: activityKindFilters,
                            label: "Filter by activity kind",
                            onChange: (value: string) => handleFilterChange({ activityKind: value as ActivityKind }),
                        },
                        {
                            value: activeTab,
                            key: "media-type",
                            items: mediaTypeFilters,
                            label: "Filter by media type",
                            onChange: (value: string) => handleFilterChange({ activeTab: value as MediaType | "all" }),
                        },
                        {
                            key: "sort",
                            value: sort,
                            label: "Sort activity",
                            items: activitySortItems,
                            onChange: (value: string) => handleFilterChange({ sort: value as ActivitySort }),
                        },
                    ]}
                    actions={canEdit &&
                        <>
                            <Button onClick={() => setAddActivity(true)}>
                                <Plus data-icon="inline-start"/>
                                Add activity
                            </Button>
                            <div className="flex min-h-9 items-center gap-2">
                                <Switch
                                    id="hidden-only"
                                    checked={hiddenOnly}
                                    onCheckedChange={checked => handleFilterChange({ hiddenOnly: checked })}
                                />
                                <Label htmlFor="hidden-only" className="whitespace-nowrap text-sm">
                                    Hidden only
                                </Label>
                            </div>
                        </>
                    }
                />

                <div className="pt-3">
                    <BrowseAppliedFilters
                        total={apiData.total}
                        totalPages={apiData.pages}
                        filters={{ page, search, mediaType: activeTab !== "all" ? activeTab : undefined }}
                        onRemove={key => handleFilterChange(key === "search" ? { search: undefined } : { activeTab: "all" })}
                        onReset={() => handleFilterChange({
                            hiddenOnly: false,
                            search: undefined,
                            activityKind: ActivityKind.ALL,
                            activeTab: "all",
                        })}
                        additionalGroups={[
                            ...(activityKind !== ActivityKind.ALL ? [{
                                key: "activityKind", label: "Activity", items: [{
                                    key: activityKind,
                                    label: activityKindFilters.find(filter => filter.value === activityKind)!.label,
                                    removeLabel: "Remove activity kind filter",
                                    onRemove: () => handleFilterChange({ activityKind: ActivityKind.ALL }),
                                }],
                            }] : []),
                            ...(hiddenOnly ? [{
                                key: "hiddenOnly", label: "Visibility", items: [{
                                    key: "hiddenOnly", label: "Hidden only", removeLabel: "Remove hidden-only filter",
                                    onRemove: () => handleFilterChange({ hiddenOnly: false }),
                                }],
                            }] : []),
                        ]}
                    />
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

                {apiData.items.length > 0 && display === "table" &&
                    <MonthlyActivityTable
                        view={view}
                        canEdit={canEdit}
                        rows={apiData.items}
                        onEdit={setEditActivity}
                        onOccurrences={setOccurrencesActivity}
                        showMediaType={activeTab === "all"}
                    />
                }

                {apiData.items.length > 0 && display === "grid" &&
                    <div className="grid grid-cols-2 gap-4 pt-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {apiData.items.map((row) =>
                            <MediaCard key={row.id} mediaType={row.mediaType} item={row}>
                                {row.mediaType !== MediaType.MOVIES && row.mediaType !== MediaType.GAMES &&
                                    <MediaCardLeftCorner>
                                        {formatNumber(row.progressGained)} {getMediaDefinition(row.mediaType).progress.unit.short}
                                    </MediaCardLeftCorner>
                                }

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
                                            {activeTab === "all" &&
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
                                            <MonthlyActivityStatusIcons
                                                row={row}
                                            />
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
                    onChangePage={(nextPage) => updateFilters({ page: nextPage })}
                />
            </section>

            {editActivity &&
                <MonthlyActivityEditDialog
                    open={true}
                    activity={editActivity}
                    onOpenChange={() => setEditActivity(null)}
                />
            }

            {addActivity &&
                <MonthlyActivityAddDialog
                    open={true}
                    year={Number(year)}
                    onOpenChange={setAddActivity}
                    mediaTypes={activeMediaTypes}
                    month={view === "year" ? undefined : Number(month)}
                />
            }

            {occurrencesActivity &&
                <YearlyActivityOccurrencesDialog
                    open={true}
                    activity={occurrencesActivity}
                    onSelect={handleOccurrenceSelect}
                    onOpenChange={() => setOccurrencesActivity(null)}
                />
            }
        </>
    );

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
