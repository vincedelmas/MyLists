import {History} from "lucide-react";
import {Link} from "@tanstack/react-router";
import type {SearchType} from "@/lib/schemas";
import {Payload} from "@/lib/client/components/general/Payload";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import type {AdminUpdateHistoryData} from "@/lib/client/react-query/query-options/admin.options";
import {type ColumnDef, rowPaginationFeature, tableFeatures, useTable} from "@tanstack/react-table";


interface UpdateHistoryTableProps {
    filters: SearchType;
    history: AdminUpdateHistoryData;
}


const features = tableFeatures({ rowPaginationFeature });


export function UpdateHistoryTable({ history, filters }: UpdateHistoryTableProps) {
    const { search = "" } = filters;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search, options: { resetScroll: false } });
    const { pagination, onPaginationChange } = useTablePagination({
        page: filters.page,
        pageSize: filters.perPage ?? 25,
        onPageChange: page => updateFilters({ page }),
    });

    const columns: ColumnDef<typeof features, AdminUpdateHistoryData["items"][number]>[] = [
        {
            header: "Account",
            accessorKey: "username",
            cell: ({ row: { original } }) => (
                <Link
                    to="/profile/$username"
                    params={{ username: original.username! }}
                    className="font-medium hover:underline underline-offset-4"
                >
                    {original.username}
                </Link>
            ),
        },
        {
            header: "Media",
            accessorKey: "mediaName",
            cell: ({ row: { original } }) => (
                <div className="flex min-w-48 max-w-96 items-center gap-3 whitespace-normal">
                    <MainThemeIcon
                        type={original.mediaType}
                        className="size-4 shrink-0"
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                        <Link
                            to="/details/$mediaType/$mediaId"
                            params={{ mediaType: original.mediaType, mediaId: original.mediaId }}
                            className="wrap-break-word font-medium hover:underline underline-offset-4"
                        >
                            {original.mediaName}
                        </Link>
                    </div>
                </div>
            ),
        },
        {
            header: "Change",
            accessorKey: "updateType",
            cell: ({ row: { original } }) => (
                <div className="flex flex-col items-start gap-1 whitespace-normal capitalize">
                    <Payload
                        update={original}
                    />
                </div>
            ),
        },
        {
            header: "Updated",
            accessorKey: "timestamp",
            cell: ({ row: { original } }) => <RelativeTime date={original.timestamp}/>,
        },
    ];

    const table = useTable({
        columns,
        features,
        onPaginationChange,
        data: history.items,
        manualPagination: true,
        rowCount: history.total,
        state: { pagination },
    });

    return (
        <section className="my-6 flex min-w-0 flex-col gap-4" aria-label="Media update history">
            <SectionHeader
                title="Recent changes"
                description="Account activity across all media types, with the latest changes first."
            />
            <SearchInput
                value={localSearch}
                onChange={handleInputChange}
                className="w-full sm:max-w-80"
                placeholder="Search by media name…"
                aria-label="Search update history by media name"
            />
            <DataTable
                table={table}
                ariaLabel="Media update history"
                emptyMessage={
                    <EmptyState
                        icon={History}
                        className="py-4"
                        message={search ? "No updates match your search." : "No media updates recorded yet."}
                    />
                }
            />
            <TablePagination
                table={table}
            />
        </section>
    );
}
