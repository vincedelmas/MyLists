import React, {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {useSuspenseQuery} from "@tanstack/react-query";
import {LayoutGrid, Plus, Settings2} from "lucide-react";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {MediaCard} from "@/lib/client/components/media/base/MediaCard";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {CalendarNav} from "@/lib/client/components/activity/CalendarNav";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {ActivityAddDialog} from "@/lib/client/components/activity/ActivityAddDialog";
import {ActivityEditDialog} from "@/lib/client/components/activity/ActivityEditDialog";
import {MediaCornerCommon} from "@/lib/client/components/media/base/MediaCornerCommon";
import {ActivityStatusIcon} from "@/lib/client/components/activity/ActivityStatusIcon";
import {ActivityEditor, ActivityKind, ActivitySearch} from "@/lib/types/activity.types";
import {MonthlyActivityStats} from "@/lib/client/components/activity/MonthlyActivityStats";
import {monthlyActivityOptions} from "@/lib/client/react-query/query-options/query-options";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Separator} from "@/lib/client/components/ui/separator";


interface MonthlyActivityContentProps {
    username: string;
    filters: ActivitySearch;
    fixedMediaType?: MediaType;
}


const activityKindFilters: { label: string, value: ActivityKind }[] = [
    { label: "All Activities", value: "all" },
    { label: "Completed", value: "completed" },
    { label: "In progress", value: "progressed" },
    { label: "Re-experience", value: "redo" },
];


export function MonthlyActivityContent({ username, filters, fixedMediaType }: MonthlyActivityContentProps) {
    const { currentUser } = useAuth();
    const canEdit = currentUser?.name === username;
    const [addActivity, setAddActivity] = useState(false);
    const [editActivity, setEditActivity] = useState<ActivityEditor | null>(null);
    const activeFilters = fixedMediaType ? { ...filters, activeTab: fixedMediaType } : filters;

    const apiData = useSuspenseQuery(monthlyActivityOptions(username, activeFilters)).data;
    const { activeTab = "all", activityKind = "all", hiddenOnly = false, search = "", page = 1, ...dateFilters } = activeFilters;

    const {
        localSearch,
        handleInputChange,
        updateFilters
    } = useSearchNavigate<ActivitySearch>({ search, options: { resetScroll: false } });

    const activeMediaTypes = fixedMediaType
        ? [fixedMediaType]
        : currentUser?.settings.filter(s => s.active).map(s => s.mediaType) ?? apiData.mediaTypes;

    const handleFilterChange = (next: Partial<ActivitySearch>) => {
        updateFilters({ page: 1, ...next, ...(fixedMediaType ? { activeTab: fixedMediaType } : {}) });
    };

    return (
        <div className="space-y-5">
            <CalendarNav
                activeYear={Number(dateFilters.year)}
                activeMonth={Number(dateFilters.month)}
                onDateChange={(year, month) => handleFilterChange({ year, month, activeTab: fixedMediaType ?? "all" })}
            />

            <MonthlyActivityStats
                username={username}
                year={dateFilters.year}
                month={dateFilters.month}
                mediaType={fixedMediaType}
            />

            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid grid-cols-2 gap-3 sm:flex sm:grow sm:items-center min-w-0">
                    <div className="col-span-2 min-w-0 sm:order-2 sm:grow">
                        <SearchInput
                            className="w-full"
                            value={localSearch}
                            onChange={handleInputChange}
                            placeholder="Search activity by title..."
                        />
                    </div>
                    <div className="col-span-1 sm:order-1 sm:shrink-0">
                        <Select value={activityKind} onValueChange={(v) => handleFilterChange({ activityKind: v as ActivityKind })}>
                            <SelectTrigger className="w-full sm:w-36">
                                <SelectValue placeholder="Activity Kind"/>
                            </SelectTrigger>
                            <SelectContent>
                                {activityKindFilters.map((filter) =>
                                    <SelectItem key={filter.value} value={filter.value}>
                                        {filter.label}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    {!fixedMediaType &&
                        <div className="col-span-1 sm:order-3 sm:shrink-0">
                            <Select value={activeTab} onValueChange={(v) => handleFilterChange({ activeTab: v as MediaType | "all" })}>
                                <SelectTrigger className="w-full sm:w-36">
                                    <SelectValue placeholder="Media type"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <MainThemeIcon type="all"/>
                                            <span>All Types</span>
                                        </div>
                                    </SelectItem>
                                    {apiData.mediaTypes.map((mediaType) =>
                                        <SelectItem key={mediaType} value={mediaType}>
                                            <div className="flex items-center gap-2 capitalize">
                                                <MainThemeIcon type={mediaType}/>
                                                <span>{mediaType}</span>
                                            </div>
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                </div>
                {canEdit &&
                    <div className="flex items-center gap-3 sm:justify-end shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setAddActivity(true)}
                            className="flex-1 sm:flex-initial justify-center gap-2"
                        >
                            <Plus className="size-4 shrink-0"/>
                            <span>Add activity</span>
                        </Button>
                        <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3
                        shadow-sm flex-1 sm:flex-initial justify-center cursor-pointer select-none">
                            <Switch
                                id="hidden-only"
                                checked={hiddenOnly}
                                onCheckedChange={(checked) => handleFilterChange({ hiddenOnly: checked })}
                            />
                            <label htmlFor="hidden-only" className="text-sm font-medium leading-none cursor-pointer">
                                Hidden Only
                            </label>
                        </div>
                    </div>
                }
            </div>

            {apiData.items.length === 0 &&
                <EmptyState
                    iconSize={50}
                    className="py-20"
                    icon={LayoutGrid}
                    message={hiddenOnly ? "No hidden activity." : "No activity recorded."}
                />
            }

            {apiData.items.length > 0 &&
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {apiData.items.map((row) =>
                        <MediaCard key={row.id} item={{ ...row, mediaCover: row.mediaCover }} mediaType={row.mediaType}>
                            <div className="absolute left-1.5 top-1.5 z-10 flex flex-col items-start gap-1">
                                {row.hidden &&
                                    <Badge variant="destructive">Hidden</Badge>
                                }
                            </div>
                            {canEdit &&
                                <>
                                    <MediaCornerCommon/>
                                    <div className="absolute right-2 top-2 z-10 flex gap-1">
                                        <div role="button" onClick={() => setEditActivity(row)}>
                                            <Settings2 className="size-4 opacity-70 hover:opacity-90 transition-opacity"/>
                                        </div>
                                    </div>
                                </>
                            }
                            <div className="absolute bottom-0 w-full space-y-2 rounded-b-sm p-3">
                                <div className="flex w-full items-center justify-between space-x-2 max-sm:text-sm">
                                    <h3 className="grow truncate font-semibold" title={row.mediaName}>
                                        {row.mediaName}
                                    </h3>
                                </div>
                                <div className="flex w-full flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <MainThemeIcon type={row.mediaType} size={14}/>
                                    <span>-</span>
                                    <span>{formatMinutes(row.timeGained)}</span>
                                    <ActivityStatusIcon row={row}/>
                                </div>
                            </div>
                        </MediaCard>
                    )}
                </div>
            }

            <Separator/>

            <div className="text-muted-foreground text-sm flex justify-end -mt-2">
                {apiData.total} items
            </div>

            <Pagination
                currentPage={page}
                totalPages={apiData.pages}
                onChangePage={(nextPage) => updateFilters({
                    page: nextPage,
                    ...(fixedMediaType ? { activeTab: fixedMediaType } : {}),
                })}
            />

            {editActivity &&
                <ActivityEditDialog
                    activity={editActivity}
                    open={Boolean(editActivity)}
                    onOpenChange={() => setEditActivity(null)}
                />
            }

            <ActivityAddDialog
                open={addActivity}
                onOpenChange={setAddActivity}
                mediaTypes={activeMediaTypes}
                year={Number(dateFilters.year)}
                month={Number(dateFilters.month)}
            />
        </div>
    );
}
