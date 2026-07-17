import {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import type {BookListArgs, GameListArgs, MangaListArgs, MovieListArgs, TvListArgs} from "@/lib/contracts/media/lists";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {ListPagination, UserMediaItem} from "@/lib/types/query.options.types";
import {ColumnDef} from "@tanstack/react-table";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {ColumnConfigProps} from "@/lib/client/components/media/base/BaseListTable";
import {flexRender, getCoreRowModel, OnChangeFn, PaginationState, useReactTable} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";


type FamilyListArgs = TvListArgs | MovieListArgs | GameListArgs | BookListArgs | MangaListArgs;

interface TypedMediaTableProps<T extends UserMediaItem, A extends FamilyListArgs> {
    isCurrent: boolean;
    mediaType: MediaType;
    filters: A;
    queryOption: ReturnType<typeof mediaListOptions>;
    onChangePage: (filters: { page: number }) => void;
    results: {
        items: T[];
        pagination: ListPagination;
    };
    getColumns: (props: ColumnConfigProps) => ColumnDef<T>[];
}


export const TypedMediaTable = <T extends UserMediaItem, A extends FamilyListArgs>({ filters, isCurrent, mediaType, results, queryOption, getColumns, onChangePage }: TypedMediaTableProps<T, A>) => {
    const { currentUser } = useAuth();
    const isConnected = !!currentUser;
    const isMediaTypeActive = currentUser?.settings.some((setting) => setting.mediaType === mediaType && setting.active) ?? false;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const paginationState = { pageIndex: filters?.page ? (filters.page - 1) : 0, pageSize: 25 };

    const onPaginationChange: OnChangeFn<PaginationState> = (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === "function" ? updaterOrValue(paginationState) : updaterOrValue;
        onChangePage({ page: newPagination.pageIndex + 1 });
    };

    const handleEdit = (mediaId: number) => {
        setEditingId(mediaId);
        setDialogOpen(true);
    };

    const listColumns = getColumns({ isCurrent, isConnected, isMediaTypeActive, mediaType, queryOption, onEdit: handleEdit });

    const table = useReactTable({
        manualFiltering: true,
        manualPagination: true,
        data: results.items ?? [],
        columns: listColumns,
        getCoreRowModel: getCoreRowModel(),
        onPaginationChange: onPaginationChange,
        state: { pagination: paginationState },
        rowCount: results.pagination.totalItems ?? 0,
    });

    const getCurrentEditingItem = () => {
        if (!editingId) return null;
        return results.items.find((item) => item.mediaId === editingId);
    };

    return (
        <>
            <div className="rounded-md border p-3 pt-0">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) =>
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) =>
                                    <TableHead key={header.id}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                )}
                            </TableRow>
                        )}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ?
                            table.getRowModel().rows.map((row) =>
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) =>
                                        <TableCell key={cell.id} style={{ width: getColumnWidth(cell.column.id) }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                            :
                            <TableRow>
                                <TableCell colSpan={listColumns.length} className="h-24 text-center">
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
            <UserMediaEditDialog
                dialogOpen={dialogOpen}
                queryOption={queryOption}
                userMedia={getCurrentEditingItem()!}
                onOpenChange={() => {
                    setEditingId(null);
                    setDialogOpen(false);
                }}
            />
        </>
    );
};


function getColumnWidth(colId: string) {
    const columnWidths: Record<string, string> = {
        "Name": "auto",
        "status": "auto",
        "Progress": "auto",
        "Information": "250px",
        "actions": "80px",
    };
    return columnWidths[colId] || "auto";
}
