import React, {useMemo} from "react";
import {SearchType} from "@/lib/schemas";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {formatNumber} from "@/lib/utils/number-formatting";
import {useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {adminMediadleOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {ColumnDef, flexRender, getCoreRowModel, OnChangeFn, PaginationState, useReactTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_admin/admin/mediadle")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(adminMediadleOptions(search));
    },
    component: AdminMediadlePage,
})


const DEFAULT = { search: "", page: 1 } satisfies SearchType;


function AdminMediadlePage() {
    const filters = Route.useSearch();
    const { search = DEFAULT.search } = filters;
    const apiData = useSuspenseQuery(adminMediadleOptions(filters)).data;
    const paginationState = { pageIndex: filters?.page ? (filters.page - 1) : 0, pageSize: 25 };
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search });

    const onPaginationChange: OnChangeFn<PaginationState> = (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === "function" ? updaterOrValue(paginationState) : updaterOrValue;
        updateFilters({ search: search, page: newPagination.pageIndex + 1 });
    };

    const mediadleColumns: ColumnDef<typeof apiData.items[0]>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: "Username",
            cell: ({ row: { original } }) => {
                return (
                    <div className="flex items-center gap-3">
                        <ProfileIcon
                            fallbackSize="text-sm"
                            className="size-9 border-2"
                            user={{ image: original.image, name: original.name }}
                        />
                        <div>
                            <Link to="/profile/$username" params={{ username: original.name }} className="hover:underline hover:underline-offset-2">
                                {original.name}
                            </Link>
                            <p className="text-sm text-gray-500">
                                {original.email}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: "Registered",
            cell: ({ row: { original } }) => formatDateTime(original.createdAt),
        },
        {
            accessorKey: "updatedAt",
            header: "Last Seen",
            cell: ({ row: { original } }) => formatDateTime(original.updatedAt),
        },
        {
            accessorKey: "averageAttempts",
            header: "Avg. Attempts",
            cell: ({ row: { original } }) => (
                <div className="text-center">
                    {formatNumber(original?.averageAttempts, { fractionDigits: 1, locale: "en" })}
                </div>
            ),
        },
        {
            accessorKey: "streak",
            header: "Streak",
            cell: ({ row: { original } }) => (
                <div className="text-center">{original.streak}</div>
            ),
        },
        {
            accessorKey: "bestStreak",
            header: "Best Streak",
            cell: ({ row: { original } }) => (
                <div className="text-center">{original.bestStreak}</div>
            ),
        },
        {
            accessorKey: "totalPlayed",
            header: "Total Played",
            cell: ({ row: { original } }) => (
                <div className="text-center">{original.totalPlayed}</div>
            ),
        },
        {
            accessorKey: "totalWon",
            header: "Total Won",
            cell: ({ row: { original } }) => (
                <div className="text-center">
                    {original.totalWon}
                </div>
            ),
        },
    ], []);

    const table = useReactTable({
        manualFiltering: true,
        manualPagination: true,
        columns: mediadleColumns,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        getCoreRowModel: getCoreRowModel(),
        onPaginationChange: onPaginationChange,
        state: { pagination: paginationState },
    });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Mediadle Stats"
                description="View all users moviedle stats."
            />
            <div className="flex items-center justify-between mb-3 max-sm:flex-col max-sm:items-start max-sm:justify-center">
                <SearchInput
                    className="w-64"
                    value={localSearch}
                    onChange={handleInputChange}
                    placeholder="Search by name..."
                />
            </div>
            <div className="rounded-md border p-3 pt-0 overflow-x-auto">
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
                                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                                <TableCell colSpan={mediadleColumns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        }
                    </TableBody>
                </Table>
            </div>
            <div className="mt-3">
                <TablePagination
                    table={table}
                    withSelection={false}
                />
            </div>
        </DashboardShell>
    );
}
