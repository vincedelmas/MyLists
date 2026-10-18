import {Radio} from "lucide-react";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {formatMs, formatNumber} from "@/lib/utils/formatting/number";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {type ColumnDef, tableFeatures, useTable} from "@tanstack/react-table";
import type {AdminApiRequestsData} from "@/lib/client/react-query/query-options/admin.options";


type RequestHistory = AdminApiRequestsData["recentCalls"];


interface ApiRequestHistoryProps {
    history: RequestHistory;
    onPageChange: (page: number) => void;
}


const features = tableFeatures({});


export function ApiRequestHistory({ history, onPageChange }: ApiRequestHistoryProps) {
    const columns: ColumnDef<typeof features, RequestHistory["items"][number]>[] = [
        {
            header: "Provider",
            accessorKey: "provider",
            cell: ({ row: { original } }) => (
                <span className="font-medium capitalize">
                    {original.provider}
                </span>
            ),
        },
        {
            header: "Requests",
            accessorKey: "total",
            cell: ({ row: { original } }) => formatNumber(original.total),
        },
        {
            header: "Failed",
            accessorKey: "errors",
            cell: ({ row: { original } }) => (
                <span className={original.errors > 0 ? "text-warning" : undefined}>
                    {formatNumber(original.errors)}
                </span>
            ),
        },
        {
            header: "Average latency",
            accessorKey: "durationMsTotal",
            cell: ({ row: { original } }) => formatMs(original.total
                ? Math.round(original.durationMsTotal / original.total)
                : 0
            ),
        },
        {
            header: "Peak / sec",
            accessorKey: "maxSecondBurst",
            cell: ({ row: { original } }) => formatNumber(original.maxSecondBurst),
        },
        {
            accessorKey: "bucketStart",
            header: "Minute beginning",
            cell: ({ row: { original } }) => <RelativeTime date={original.bucketStart}/>,
        },
    ];

    const table = useTable({
        columns,
        features,
        data: history.items,
    });

    return (
        <section className="mb-6 flex min-w-0 flex-col gap-4" aria-label="Recent API request summaries">
            <SectionHeader
                title="Recent request summaries"
                description="Saved one-minute totals per provider, newest first. This history covers all periods."
            />
            <DataTable
                table={table}
                ariaLabel="Recent API request summaries"
                emptyMessage={
                    <EmptyState
                        icon={Radio}
                        className="py-4"
                        message="No API request summaries recorded yet."
                    />
                }
            />
            <Pagination
                currentPage={history.page}
                totalPages={history.pages}
                onChangePage={onPageChange}
            />
        </section>
    );
}
