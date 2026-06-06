import {cn} from "@/lib/utils/classnames";
import {Table} from "@tanstack/react-table";
import {Button} from "@/lib/client/components/ui/button";
import {ArrowLeftToLine, ArrowRightToLine, ChevronLeft, ChevronRight} from "lucide-react";


interface TablePaginationProps<TData> {
    table: Table<TData>;
    withSelection?: boolean;
}


export function TablePagination<TData>({ table, withSelection = true }: TablePaginationProps<TData>) {
    "use no memo";

    return (
        <div className={cn("flex items-center justify-between", !withSelection && "justify-end")}>
            {withSelection &&
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
            }
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex w-25 items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount() === 0 ? 1 : table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden size-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                        <span className="sr-only">Go to first page</span>
                        <ArrowLeftToLine className="size-4"/>
                    </Button>
                    <Button variant="outline" className="size-8 p-0" onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}>
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="size-4"/>
                    </Button>
                    <Button variant="outline" className="size-8 p-0" onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}>
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="size-4"/>
                    </Button>
                    <Button variant="outline" className="hidden size-8 p-0 lg:flex" disabled={!table.getCanNextPage()}
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}>
                        <span className="sr-only">Go to last page</span>
                        <ArrowRightToLine className="size-4"/>
                    </Button>
                </div>
            </div>
        </div>
    );
}
