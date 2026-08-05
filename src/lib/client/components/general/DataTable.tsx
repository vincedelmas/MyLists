import {cn} from "@/lib/utils/classnames";
import {CSSProperties, ReactNode} from "react";
import {Cell, flexRender, Row, Table as TanStackTable} from "@tanstack/react-table";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";


interface DataTableProps<TData> {
    className?: string;
    emptyMessage?: ReactNode;
    table: TanStackTable<TData>;
    getRowClassName?: (row: Row<TData>) => string | undefined;
    getCellStyle?: (cell: Cell<TData, unknown>) => CSSProperties | undefined;
}


export function DataTable<TData>({ table, emptyMessage = "No results.", className, getRowClassName, getCellStyle }: DataTableProps<TData>) {
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
                            <TableRow key={row.id} data-state={cn(row.getIsSelected() && "selected")} className={getRowClassName?.(row)}>
                                {row.getVisibleCells().map((cell) =>
                                    <TableCell key={cell.id} style={getCellStyle?.(cell)}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                )}
                            </TableRow>
                        )
                        :
                        <TableRow>
                            <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    }
                </TableBody>
            </Table>
        </div>
    );
}
