import type {ReactNode} from "react";
import type {Status} from "@/lib/utils/enums";
import type {MediaListArgs, SearchType} from "@/lib/schemas";
import type {ListPagination} from "@/lib/types/query.options.types";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {MediaBrowseToolbar} from "@/lib/client/components/media/browse/MediaBrowseToolbar";


interface HeaderProps {
    isGrid: boolean;
    trailing?: ReactNode;
    filters: MediaListArgs;
    onGridClick: () => void;
    onFilterClick: () => void;
    pagination: ListPagination;
    allStatuses: readonly Status[];
    onSortChange: ({ sorting }: { sorting: string }) => void;
    onStatusChange: ({ status }: { status: Status[] }) => void;
}


export const Header = (props: HeaderProps) => {
    const { allStatuses, filters, isGrid, trailing, onGridClick, onFilterClick, pagination, onSortChange, onStatusChange } = props;
    const { localSearch, handleInputChange } = useSearchNavigate<SearchType>({ search: filters.search ?? "" });

    const statusItems = ["All Statuses", ...allStatuses].map(status => ({ label: status, value: status }));
    const selectedStatus = filters.status?.find(status => allStatuses.includes(status)) ?? "All Statuses";

    return (
        <MediaBrowseToolbar
            isGrid={isGrid}
            search={localSearch}
            onGridClick={onGridClick}
            onFiltersClick={onFilterClick}
            onSearchChange={handleInputChange}
            trailing={trailing}
            searchLabel="Search this media list"
            searchPlaceholder="Search this list..."
            selects={[
                {
                    key: "status",
                    items: statusItems,
                    value: selectedStatus,
                    label: "Filter by status",
                    onChange: status => onStatusChange({
                        status: status === "All Statuses" ? [] : [...(filters.status ?? []), status as Status],
                    }),
                },
                {
                    key: "sorting",
                    label: "Sort media list",
                    value: pagination.sorting,
                    onChange: sorting => onSortChange({ sorting }),
                    items: pagination.availableSorting.map(sort => ({ label: sort, value: sort })),
                },
            ]}
        />
    );
};
