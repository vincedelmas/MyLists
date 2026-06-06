import React from "react";
import {cn} from "@/lib/utils/classnames";
import {Status} from "@/lib/utils/enums";
import {MediaListArgs, SearchType} from "@/lib/schemas";
import {Button} from "@/lib/client/components/ui/button";
import {ListPagination} from "@/lib/types/query.options.types";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {ArrowUpDown, ChevronDown, DicesIcon, Filter, Grid2X2, List, ListFilter} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger
} from "@/lib/client/components/ui/dropdown-menu";


interface HeaderProps {
    isGrid: boolean;
    allStatuses: Status[];
    filters: MediaListArgs;
    onGridClick: () => void;
    onFilterClick: () => void;
    onSurpriseMeClick: () => void;
    pagination: ListPagination;
    onSortChange: ({ sorting }: { sorting: string }) => void;
    onStatusChange: ({ status }: { status: Status[] }) => void;
}


export const Header = (props: HeaderProps) => {
    const isBelowSm = useBreakpoint("sm");
    const { allStatuses, filters, isGrid, onGridClick, onFilterClick, pagination, onSortChange, onStatusChange, onSurpriseMeClick } = props;
    const { localSearch, handleInputChange } = useSearchNavigate<SearchType>({ search: filters.search ?? "" });

    if (isBelowSm) {
        return (
            <div className="space-y-3">
                <SearchInput
                    value={localSearch}
                    onChange={handleInputChange}
                    placeholder={`Search in ${filters.status ?? "All Media"}...`}
                />

                <div className="flex w-full gap-3">
                    <StatusComponent
                        className="grow"
                        filters={filters}
                        allStatuses={allStatuses}
                        onStatusChange={({ status }) => onStatusChange({ status })}
                    />
                    <SortComponent
                        className="grow"
                        applySorting={onSortChange}
                        sorting={pagination.sorting}
                        allSorting={pagination.availableSorting}
                    />
                </div>

                <div className="flex items-center justify-start gap-3">
                    <Button
                        variant="outline"
                        onClick={onFilterClick}
                        title="Advanced Filters"
                    >
                        <Filter className="size-4"/> Filters
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onSurpriseMeClick}
                        title="Surprise Me"
                    >
                        <DicesIcon className="size-4"/> Surprise Me
                    </Button>
                    <div className="flex h-9 items-center justify-center rounded-md border bg-input/30 px-1">
                        <button
                            onClick={onGridClick}
                            className={cn("p-1.5 rounded-sm transition-all", isGrid
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Grid2X2 className="size-4"/>
                        </button>
                        <button
                            onClick={onGridClick}
                            className={cn("p-1.5 rounded-sm transition-all", isGrid
                                ? "text-muted-foreground hover:text-foreground"
                                : "bg-background shadow-sm text-foreground",
                            )}
                        >
                            <List className="size-4"/>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            <StatusComponent
                className="w-45"
                filters={filters}
                allStatuses={allStatuses}
                onStatusChange={({ status }) => onStatusChange({ status })}
            />
            <div className="grow">
                <SearchInput
                    value={localSearch}
                    onChange={handleInputChange}
                    placeholder={`Search in ${filters.status ?? "All Media"}...`}
                />
            </div>
            <Button
                variant="outline"
                onClick={onFilterClick}
                title="Advanced Filters"
                className="w-full md:w-auto"
            >
                <Filter className="size-4"/> Filters
            </Button>
            <Button
                variant="outline"
                onClick={onSurpriseMeClick}
                title="Surprise Me"
            >
                <DicesIcon className="size-4"/> Surprise Me
            </Button>
            <SortComponent
                className="w-45"
                applySorting={onSortChange}
                sorting={pagination.sorting}
                allSorting={pagination.availableSorting}
            />
            <div className="h-9 flex items-center rounded-md border bg-input/30 px-1">
                <button
                    onClick={onGridClick}
                    className={cn(
                        "p-1.5 rounded-sm transition-all",
                        isGrid
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    <Grid2X2 className="size-4"/>
                </button>
                <button
                    onClick={onGridClick}
                    className={cn(
                        "p-1.5 rounded-sm transition-all",
                        isGrid
                            ? "text-muted-foreground hover:text-foreground"
                            : "bg-background shadow-sm text-foreground",
                    )}
                >
                    <List className="size-4"/>
                </button>
            </div>
        </div>
    );
};


interface StatusComponentProps {
    className?: string;
    allStatuses: Status[];
    filters: MediaListArgs;
    onStatusChange: ({ status }: { status: Status[] }) => void;
}


const StatusComponent = ({ filters, allStatuses, onStatusChange, className }: StatusComponentProps) => {
    const activeStatus = filters.status?.[0] ?? "All Media";
    const allStatusesWithAll = ["All Media", ...allStatuses];

    const handleStatusChange = (status: string) => {
        if (status === "All Media") {
            return onStatusChange({ status: [] });
        }
        onStatusChange({ status: [...(filters.status || []), status as Status] });
    };

    const checkIfChecked = (status: string) => {
        if (status === "All Media" && activeStatus === "All Media") return true;
        return filters.status ? filters.status.includes(status as Status) : false;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn("justify-between focus:outline-none focus:ring-none", className)}>
                    <span className="flex items-center gap-2 truncate">
                        <ListFilter className="size-4 text-muted-foreground"/>
                        <span>{activeStatus}</span>
                    </span>
                    <ChevronDown className="size-4 opacity-50"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40 max-w-45">
                {allStatusesWithAll.map((s) =>
                    <DropdownMenuCheckboxItem
                        key={s}
                        checked={checkIfChecked(s)}
                        onSelect={() => handleStatusChange(s)}
                    >
                        {s}
                    </DropdownMenuCheckboxItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


interface SortComponentProps {
    sorting: string,
    className?: string;
    allSorting: string[],
    applySorting: ({ sorting }: { sorting: string }) => void,
}


const SortComponent = ({ sorting, allSorting, applySorting, className }: SortComponentProps) => {
    const handleSortChange = (sort: string) => {
        applySorting({ sorting: sort });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn("justify-between focus-visible:ring-none", className)}>
                    <span className="flex items-center gap-2 truncate">
                        <ArrowUpDown className="size-4 text-muted-foreground"/>
                        <span>{sorting}</span>
                    </span>
                    <ChevronDown className="size-4 opacity-50"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40 max-w-45">
                <DropdownMenuRadioGroup value={sorting} onValueChange={handleSortChange}>
                    {allSorting.map((sort) =>
                        <DropdownMenuRadioItem key={sort} value={sort}>
                            {sort}
                        </DropdownMenuRadioItem>
                    )}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
