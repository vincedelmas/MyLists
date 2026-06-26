import React, {useMemo, useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {createFileRoute, Link} from "@tanstack/react-router";
import {SimpleSearch, simpleSearchSchema} from "@/lib/schemas";
import {Payload} from "@/lib/client/components/general/Payload";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {allUpdatesOptions} from "@/lib/client/react-query/query-options";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {useDeleteAllUpdatesMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {ColumnDef, flexRender, getCoreRowModel, OnChangeFn, PaginationState, useReactTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_main/_viewer/profile/$username/_header/history")({
    validateSearch: simpleSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    loader: ({ context: { queryClient }, params: { username }, deps: { search } }) => {
        return queryClient.ensureQueryData(allUpdatesOptions(username, search));
    },
    component: AllUpdates,
});


function AllUpdates() {
    const filters = Route.useSearch();
    const { currentUser } = useAuth();
    const { username } = Route.useParams();
    const isCurrent = (currentUser?.name === username);
    const [rowSelected, setRowSelected] = useState({});
    const deleteUpdateMutation = useDeleteAllUpdatesMutation(username, filters);
    const apiData = useSuspenseQuery(allUpdatesOptions(username, filters)).data;
    const paginationState = { pageIndex: (filters?.page ?? 1) - 1, pageSize: 25 };
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SimpleSearch>({
        search: filters.search ?? "", options: { resetScroll: false }
    });

    const onPaginationChange: OnChangeFn<PaginationState> = async (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === "function" ? updaterOrValue(paginationState) : updaterOrValue;
        updateFilters({ page: newPagination.pageIndex + 1 });
    };

    const deleteSelectedRows = async () => {
        const selectedIds = Object.keys(rowSelected).map((key) => table.getRow(key).original.id);
        await deleteUpdateMutation.mutateAsync({ data: { updateIds: selectedIds } });
        setRowSelected({});
    };

    const columns: ColumnDef<typeof apiData.items[number]>[] = useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <>
                    {isCurrent &&
                        <Checkbox
                            aria-label="Select all"
                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                        />
                    }
                </>
            ),
            cell: ({ row }) => (
                <>
                    {isCurrent &&
                        <Checkbox
                            aria-label="Select row"
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(!!value)}
                        />
                    }
                </>
            ),
        },
        {
            accessorKey: "mediaName",
            header: "Name",
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
    ], [isCurrent]);

    const table = useReactTable({
        manualFiltering: true,
        manualPagination: true,
        columns: columns,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        getCoreRowModel: getCoreRowModel(),
        onRowSelectionChange: setRowSelected,
        onPaginationChange: onPaginationChange,
        state: { rowSelection: rowSelected, pagination: paginationState },
    });

    return (
        <PageTitle title="History" subtitle={isCurrent ? "All of your media updates." : `All the updates of ${username}.`}>
            <div className="w-full max-w-5xl mx-auto mt-6">
                <div className="flex justify-between items-center pb-3">
                    <div className="flex items-center gap-2">
                        <SearchInput
                            className="w-55"
                            value={localSearch}
                            onChange={handleInputChange}
                            placeholder="Search by name..."
                        />
                    </div>
                    {(isCurrent && Object.keys(rowSelected).length !== 0) &&
                        <Button
                            onClick={deleteSelectedRows}
                            disabled={Object.keys(rowSelected).length === 0 || deleteUpdateMutation.isPending}
                        >
                            Delete Selected
                        </Button>
                    }
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
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                            className={(deleteUpdateMutation.isPending && row.getIsSelected()) ? "opacity-50" : ""}
                                        >
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
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
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
                    />
                </div>
            </div>
        </PageTitle>
    );
}
