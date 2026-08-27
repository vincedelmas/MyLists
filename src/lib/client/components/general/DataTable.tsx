import {cn} from "@/lib/utils/classnames";
import {CSSProperties, ReactNode} from "react";
import {Cell, flexRender, ReactTable, Row, RowData, TableFeatures} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";


interface DataTableProps<TFeatures extends TableFeatures, TData extends RowData> {
    className?: string;
    emptyMessage?: ReactNode;
    table: ReactTable<TFeatures, TData>;
    getIsRowSelected?: (row: Row<TFeatures, TData>) => boolean;
    getRowClassName?: (row: Row<TFeatures, TData>) => string | undefined;
    getCellStyle?: (cell: Cell<TFeatures, TData, unknown>) => CSSProperties | undefined;
}


export function DataTable<TFeatures extends TableFeatures, TData extends RowData>(props: DataTableProps<TFeatures, TData>) {
    const { table, emptyMessage = "No results.", className, getIsRowSelected, getRowClassName, getCellStyle } = props;
    const rows = table.getRowModel().rows;

    return (
        <div className={cn("rounded-md border p-3 pt-0", className)}>
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
                    {rows.length ?
                        rows.map((row) =>
                            <TableRow key={row.id} data-state={getIsRowSelected?.(row) ? "selected" : undefined} className={getRowClassName?.(row)}>
                                {row.getAllCells().map((cell) =>
                                    <TableCell key={cell.id} style={getCellStyle?.(cell)}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                )}
                            </TableRow>
                        )
                        :
                        <TableRow>
                            <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    }
                </TableBody>
            </Table>
        </div>
    );
}
