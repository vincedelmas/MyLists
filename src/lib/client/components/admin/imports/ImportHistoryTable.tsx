import {Upload} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {ImportJobStatus} from "@/lib/utils/enums";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/formatting/number";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {ImportStatusBadge} from "@/lib/client/components/imports/ImportStatusBadge";
import {formatImportProcessingTime} from "@/lib/client/components/imports/import-formatting";
import {type ColumnDef, rowPaginationFeature, tableFeatures, useTable} from "@tanstack/react-table";
import type {AdminImportJob, AdminImportsData} from "@/lib/client/react-query/query-options/admin.options";


interface ImportHistoryTableProps {
    hasFilters: boolean;
    history: AdminImportsData;
    selectedJobId: number | null;
    onSelectJob: (jobId: number) => void;
    onPageChange: (page: number) => void;
}


const features = tableFeatures({ rowPaginationFeature });


export function ImportHistoryTable({ history, hasFilters, selectedJobId, onSelectJob, onPageChange }: ImportHistoryTableProps) {
    const { pagination, onPaginationChange } = useTablePagination({
        page: history.page,
        pageSize: history.perPage,
        onPageChange,
    });

    const columns: ColumnDef<typeof features, AdminImportJob>[] = [
        {
            header: "Import",
            accessorKey: "id",
            cell: ({ row: { original } }) => (
                <div className="flex flex-col gap-1">
                    <span className="font-medium">
                        #{original.id}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                        {original.source}
                    </span>
                </div>
            ),
        },
        {
            header: "Account",
            accessorKey: "username",
            cell: ({ row: { original } }) => (
                <Link
                    to="/profile/$username"
                    params={{ username: original.username }}
                    className="font-medium hover:underline underline-offset-4"
                >
                    {original.username}
                </Link>
            ),
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: ({ row: { original } }) => (
                <ImportStatusBadge
                    status={original.status}
                    nextAttemptAt={original.nextAttemptAt}
                />
            ),
        },
        {
            header: "Rows",
            accessorKey: "processedCount",
            cell: ({ row: { original } }) => (
                <div className="flex flex-col gap-1 tabular-nums">
                    <span>
                        {formatNumber(original.processedCount)} / {formatNumber(original.totalCount)} processed
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatNumber(original.completedCount)} completed ·{" "}
                        {formatNumber(original.failedCount)} failed ·{" "}
                        {formatNumber(original.skippedCount)} skipped
                    </span>
                </div>
            ),
        },
        {
            header: "Submitted",
            accessorKey: "createdAt",
            cell: ({ row: { original } }) => <RelativeTime date={original.createdAt}/>,
        },
        {
            header: "Processing time",
            accessorKey: "processingDurationMs",
            cell: ({ row: { original } }) => (
                <div className="flex flex-col gap-1 tabular-nums">
                    <span>
                        {formatImportProcessingTime(original.processingDurationMs)}
                    </span>
                    {original.status === ImportJobStatus.PROCESSING &&
                        <span className="text-xs text-muted-foreground">
                            Still running
                        </span>
                    }
                </div>
            ),
        },
        {
            id: "details",
            header: "Details",
            cell: ({ row: { original } }) => (
                <Button
                    size="sm"
                    variant="outline"
                    aria-label={`View import ${original.id}`}
                    onClick={() => onSelectJob(original.id)}
                >
                    Details
                </Button>
            ),
        },
    ];

    const table = useTable({
        columns,
        features,
        onPaginationChange,
        data: history.items,
        manualPagination: true,
        rowCount: history.total,
        getRowId: job => String(job.id),
        state: { pagination },
    });

    return (
        <>
            <DataTable
                table={table}
                ariaLabel="Import history"
                getIsRowSelected={row => row.original.id === selectedJobId}
                emptyMessage={
                    <EmptyState
                        icon={Upload}
                        className="py-4"
                        message={hasFilters ? "No imports match these filters." : "No imports recorded yet."}
                    />
                }
            />
            <TablePagination
                table={table}
            />
        </>
    );
}
