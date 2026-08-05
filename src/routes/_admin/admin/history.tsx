import React, {useMemo} from "react";
import {SearchType} from "@/lib/schemas";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Payload} from "@/lib/client/components/general/Payload";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminAllUpdatesOptions} from "@/lib/client/react-query/query-options";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {ColumnDef, getCoreRowModel, useReactTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_admin/admin/history")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(adminAllUpdatesOptions(search));
    },
    component: AdminGlobalHistory,
});


const DEFAULT = { search: "", page: 1 } satisfies SearchType;


function AdminGlobalHistory() {
    const filters = Route.useSearch();
    const { search = DEFAULT.search } = filters;
    const apiData = useSuspenseQuery(adminAllUpdatesOptions(filters)).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search, options: { resetScroll: false } });

    const { pagination, onPaginationChange } = useTablePagination({
        pageSize: 25,
        page: filters.page,
        onPageChange: (page) => updateFilters({ page }),
    });

    const historyColumns: ColumnDef<typeof apiData.items[number]>[] = useMemo(() => [
        {
            accessorKey: "username",
            header: "User",
            cell: ({ row: { original } }) => {
                return (
                    <Link
                        className="font-medium hover:underline"
                        to="/profile/$username"
                        params={{ username: original.username! }}
                    >
                        {original.username}
                    </Link>
                );
            },
        },
        {
            accessorKey: "mediaName",
            header: "Media",
            cell: ({ row: { original } }) => {
                return (
                    <div className="flex items-center gap-3">
                        <MainThemeIcon
                            size={15}
                            type={original.mediaType}
                        />
                        <Link
                            to="/details/$mediaType/$mediaId"
                            params={{ mediaType: original.mediaType, mediaId: original.mediaId }}
                            className="hover:underline"
                        >
                            {original.mediaName}
                        </Link>
                    </div>
                );
            },
        },
        {
            accessorKey: "update",
            header: "Update",
            cell: ({ row }) => <Payload update={row.original}/>,
        },
        {
            accessorKey: "timestamp",
            header: "Date",
            cell: ({ row }) => <RelativeTime date={row.original.timestamp}/>,
        },
    ], []);

    const table = useReactTable({
        manualFiltering: true,
        manualPagination: true,
        columns: historyColumns,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        getCoreRowModel: getCoreRowModel(),
        onPaginationChange,
        state: { pagination },
    });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Media Updates History"
                description="Track all media updates from all users."
            />

            <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-4">
                    <SearchInput
                        className="w-64"
                        value={localSearch}
                        onChange={handleInputChange}
                        placeholder="Search by media name..."
                    />
                </div>

                <DataTable
                    table={table}
                    className="bg-card"
                />
                <TablePagination
                    table={table}
                />
            </div>
        </DashboardShell>
    );
}
