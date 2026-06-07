import React, {useMemo} from "react";
import {SearchType} from "@/lib/schemas";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {Payload} from "@/lib/client/components/general/Payload";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {adminAllUpdatesOptions} from "@/lib/client/react-query/query-options";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {ColumnDef, flexRender, getCoreRowModel, OnChangeFn, PaginationState, useReactTable} from "@tanstack/react-table";


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
    const apiData = useSuspenseQuery(adminAllUpdatesOptions(filters)).data;
    const paginationState = { pageIndex: filters?.page ? (filters.page - 1) : 0, pageSize: 25 };

    const { search = DEFAULT.search } = filters;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search, options: { resetScroll: false } });

    const onPaginationChange: OnChangeFn<PaginationState> = async (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === "function" ? updaterOrValue(paginationState) : updaterOrValue;
        updateFilters({ page: newPagination.pageIndex + 1 });
    };

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
        onPaginationChange: onPaginationChange,
        state: { pagination: paginationState },
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

                <div className="rounded-md border p-3 pt-0 overflow-x-auto bg-card">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) =>
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) =>
                                        <TableHead key={header.id}>
                                            {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    )}
                                </TableRow>
                            )}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ?
                                table.getRowModel().rows.map((row) => {
                                    return (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) =>
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                                :
                                <TableRow>
                                    <TableCell colSpan={historyColumns.length} className="h-24 text-center">
                                        No results.
                                    </TableCell>
                                </TableRow>
                            }
                        </TableBody>
                    </Table>
                </div>
                <TablePagination table={table}/>
            </div>
        </DashboardShell>
    );
}
