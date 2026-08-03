import React, {useState} from "react";
import {MonthlyActivitySearch} from "@/lib/schemas";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Label} from "@/lib/client/components/ui/label";
import {useSuspenseQuery} from "@tanstack/react-query";
import {LayoutGrid, Plus} from "lucide-react";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {ActivityKind, MediaType} from "@/lib/utils/enums";
import {Separator} from "@/lib/client/components/ui/separator";
import {MonthlyActivityEditor} from "@/lib/types/activity.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {CalendarNav} from "@/lib/client/components/activity/CalendarNav";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {monthlyActivityOptions} from "@/lib/client/react-query/query-options";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {MonthlyActivityStats} from "@/lib/client/components/activity/MonthlyActivityStats";
import {MonthlyActivityAddDialog} from "@/lib/client/components/activity/MonthlyActivityAddDialog";
import {MonthlyActivityEditDialog} from "@/lib/client/components/activity/MonthlyActivityEditDialog";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardRightCorner, MediaCardSignals, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";
import {MediaCardEditAction} from "@/lib/client/components/media/base/MediaCardEditAction";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MonthlyActivityStatusIcons} from "@/lib/client/components/activity/MonthlyActivityStatusIcons";
import {formatMinutes} from "@/lib/utils/number-formatting";


interface MonthlyActivityContentProps {
    username: string;
    fixedMediaType?: MediaType;
    filters: MonthlyActivitySearch;
}


const activityKindFilters: { label: string, value: ActivityKind }[] = [
    { label: "All Summaries", value: ActivityKind.ALL },
    { label: "Completed", value: ActivityKind.COMPLETED },
    { label: "Progressed", value: ActivityKind.PROGRESSED },
    { label: "Re-Experienced", value: ActivityKind.REDO },
];


export function MonthlyActivityContent({ username, filters, fixedMediaType }: MonthlyActivityContentProps) {
    const { currentUser } = useAuth();
    const canEdit = currentUser?.name === username;
    const [addActivity, setAddActivity] = useState(false);
    const activeFilters = fixedMediaType ? { ...filters, activeTab: fixedMediaType } : filters;
    const [editActivity, setEditActivity] = useState<MonthlyActivityEditor | null>(null);

    const apiData = useSuspenseQuery(monthlyActivityOptions(username, activeFilters)).data;
    const mediaTypeFilters = createMediaSelectItems(apiData.mediaTypes, { leading: "all", leadingLabel: "All Types" });
    const { activeTab = "all", activityKind = ActivityKind.ALL, hiddenOnly = false, search = "", page = 1, ...dateFilters } = activeFilters;

    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<MonthlyActivitySearch>({
        search, options: { resetScroll: false },
    });

    const activeMediaTypes = fixedMediaType
        ? [fixedMediaType]
        : currentUser
            ? getActiveMediaTypes(currentUser.settings)
            : apiData.mediaTypes;

    const handleFilterChange = (next: Partial<MonthlyActivitySearch>) => {
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
                            placeholder="Search monthly activity by title..."
                        />
                    </div>
                    <div className="col-span-1 sm:order-1 sm:shrink-0">
                        <Select
                            items={activityKindFilters}
                            value={activityKind}
                            onValueChange={(value) => {
                                if (value !== null) handleFilterChange({ activityKind: value as ActivityKind });
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-42">
                                <SelectValue placeholder="Activity Kind"/>
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
                    </div>
                    {!fixedMediaType &&
                        <div className="col-span-1 sm:order-3 sm:shrink-0">
                            <Select
                                items={mediaTypeFilters}
                                value={activeTab}
                                onValueChange={(value) => {
                                    if (value !== null) handleFilterChange({ activeTab: value as MediaType | "all" });
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-36">
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
                        </div>
                    }
                </div>
                {canEdit &&
                    <div className="flex items-center gap-3 sm:justify-end shrink-0">
                        <Button onClick={() => setAddActivity(true)}>
                            <Plus/> Add Activity
                        </Button>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="hidden-only"
                                checked={hiddenOnly}
                                onCheckedChange={(checked) => handleFilterChange({ hiddenOnly: checked })}
                            />
                            <Label htmlFor="hidden-only">Hidden Only</Label>
                        </div>
                    </div>
                }
            </div>

            {apiData.items.length === 0 &&
                <EmptyState
                    iconSize={50}
                    className="py-20"
                    icon={LayoutGrid}
                    message={hiddenOnly ? "No hidden monthly activity." : "No activity recorded this month."}
                />
            }

            {apiData.items.length > 0 &&
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {apiData.items.map((row) =>
                        <MediaCard mediaType={row.mediaType} item={{ ...row, mediaCover: row.mediaCover }}>
                            {canEdit &&
                                <MediaCardRightCorner>
                                    <MediaCardEditAction
                                        onClick={() => setEditActivity(row)}
                                        label={`Edit Monthly Activity for ${row.mediaName}`}
                                    />
                                </MediaCardRightCorner>
                            }

                            <MediaCardFooter>
                                <MediaCardTitle title={row.mediaName}>
                                    {row.mediaName}
                                </MediaCardTitle>
                                <MediaCardMeta>
                                    <MediaCardDetails>
                                        {(!fixedMediaType && activeTab === "all") &&
                                            <MediaTypeIcon mediaType={row.mediaType}/>
                                        }
                                        {formatMinutes(row.timeGained)}
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
                <MonthlyActivityEditDialog
                    activity={editActivity}
                    open={Boolean(editActivity)}
                    onOpenChange={() => setEditActivity(null)}
                />
            }

            <MonthlyActivityAddDialog
                open={addActivity}
                onOpenChange={setAddActivity}
                mediaTypes={activeMediaTypes}
                year={Number(dateFilters.year)}
                month={Number(dateFilters.month)}
            />
        </div>
    );
}
