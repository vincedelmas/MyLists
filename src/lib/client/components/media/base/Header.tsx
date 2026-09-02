import {Status} from "@/lib/utils/enums";
import {cn} from "@/lib/utils/classnames";
import {Filter, Grid2X2, List} from "lucide-react";
import {MediaListArgs, SearchType} from "@/lib/schemas";
import {Button} from "@/lib/client/components/ui/button";
import {ListPagination} from "@/lib/types/query.options.types";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface HeaderProps {
    isGrid: boolean;
    allStatuses: Status[];
    filters: MediaListArgs;
    onGridClick: () => void;
    onFilterClick: () => void;
    pagination: ListPagination;
    onSortChange: ({ sorting }: { sorting: string }) => void;
    onStatusChange: ({ status }: { status: Status[] }) => void;
}


export const Header = (props: HeaderProps) => {
    const { allStatuses, filters, isGrid, onGridClick, onFilterClick, pagination, onSortChange, onStatusChange } = props;
    const { localSearch, handleInputChange } = useSearchNavigate<SearchType>({ search: filters.search ?? "" });

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_10rem_10rem_auto_auto] items-center gap-3
        max-lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] max-sm:grid-cols-2">
            <SearchInput
                value={localSearch}
                onChange={handleInputChange}
                className="w-full max-lg:col-span-full"
                placeholder="Search this list..."
                aria-label="Search this media list"
            />
            <StatusComponent
                className="max-w-none"
                filters={filters}
                allStatuses={allStatuses}
                onStatusChange={({ status }) => onStatusChange({ status })}
            />
            <SortComponent
                className="max-w-none"
                applySorting={onSortChange}
                sorting={pagination.sorting}
                allSorting={pagination.availableSorting}
            />
            <Button
                variant="outline"
                onClick={onFilterClick}
                title="Advanced filters"
                className="max-sm:w-full"
            >
                <Filter data-icon="inline-start"/> Filters
            </Button>
            <div className="justify-self-end">
                <ViewModeToggle
                    isGrid={isGrid}
                    onGridClick={onGridClick}
                />
            </div>
        </div>
    );
};


interface ViewModeToggleProps {
    isGrid: boolean;
    onGridClick: () => void;
}


const ViewModeToggle = ({ isGrid, onGridClick }: ViewModeToggleProps) => {
    const handleValueChange = (value: string[]) => {
        const nextMode = value[0];
        if (!nextMode) return;

        const nextIsGrid = nextMode === "grid";
        if (nextIsGrid !== isGrid) {
            onGridClick();
        }
    };

    return (
        <ToggleGroup
            spacing={0}
            variant="brand"
            onValueChange={handleValueChange}
            value={[isGrid ? "grid" : "table"]}
            aria-label="Media list display mode"
        >
            <ToggleGroupItem value="grid" aria-label="Grid view" title="Grid view">
                <Grid2X2/>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" title="Table view">
                <List/>
            </ToggleGroupItem>
        </ToggleGroup>
    );
};


interface StatusComponentProps {
    className?: string;
    allStatuses: Status[];
    filters: MediaListArgs;
    onStatusChange: ({ status }: { status: Status[] }) => void;
}


const StatusComponent = ({ filters, allStatuses, onStatusChange, className }: StatusComponentProps) => {
    const selectItems = ["All Media", ...allStatuses].map(status => ({ label: status, value: status }));
    const selectedStatus = filters.status?.find(status => allStatuses.includes(status)) ?? "All Media";

    const handleStatusChange = (status: string | null) => {
        if (status === null) return;
        if (status === "All Media") return onStatusChange({ status: [] });
        onStatusChange({ status: [...(filters.status || []), status as Status] });
    };

    return (
        <Select items={selectItems} value={selectedStatus} onValueChange={(val) => handleStatusChange(val)}>
            <SelectTrigger aria-label="Filter by status" className={cn("w-full max-w-48", className)}>
                <SelectValue/>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {selectItems.map((item) =>
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};


interface SortComponentProps {
    sorting: string,
    className?: string;
    allSorting: string[],
    applySorting: ({ sorting }: { sorting: string }) => void,
}


const SortComponent = ({ sorting, allSorting, applySorting, className }: SortComponentProps) => {
    const sortItems = allSorting.map(sort => ({ label: sort, value: sort }));
    const selectedSorting = allSorting.includes(sorting) ? sorting : (allSorting[0] ?? null);

    const handleSortChange = (sort: string | null) => {
        if (sort === null) return;
        applySorting({ sorting: sort });
    };

    return (
        <Select items={sortItems} value={selectedSorting} onValueChange={(val) => handleSortChange(val)}>
            <SelectTrigger aria-label="Sort media list" className={cn("w-full max-w-48", className)}>
                <SelectValue/>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {sortItems.map((item) =>
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};
