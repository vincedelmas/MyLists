import {OnChangeFn, PaginationState} from "@tanstack/react-table";


interface TablePaginationOptions {
    page?: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}


export function useTablePagination({ page = 1, pageSize, onPageChange }: TablePaginationOptions) {
    const pagination = { pageSize, pageIndex: Math.max(page, 1) - 1 };

    const onPaginationChange: OnChangeFn<PaginationState> = (updaterOrValue) => {
        const nextPagination = typeof updaterOrValue === "function" ? updaterOrValue(pagination) : updaterOrValue;
        onPageChange(nextPagination.pageIndex + 1);
    };

    return { pagination, onPaginationChange };
}
