import {Radio} from "lucide-react";
import {capitalize} from "@/lib/utils/formatting/text";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {type ColumnDef, tableFeatures, useTable} from "@tanstack/react-table";
import {formatMs, formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {apiRequestRangeOptions} from "@/lib/client/components/admin/monitoring-options";
import type {AdminApiRequestsData} from "@/lib/client/react-query/query-options/admin.options";


interface ApiRequestProvidersProps {
    data: AdminApiRequestsData;
    colors: Map<string, string>;
    onRangeChange: (value: AdminApiRequestsData["range"]) => void;
}


const features = tableFeatures({});


export function ApiRequestProviders({ data, colors, onRangeChange }: ApiRequestProvidersProps) {
    const total = data.totalsByProvider.reduce((sum, row) => sum + row.count, 0);

    const rows = data.totalsByProvider.map(row => ({
        ...row,
        share: total ? row.count / total * 100 : 0,
        errorRate: row.count ? row.errors / row.count * 100 : 0,
    }));

    const columns: ColumnDef<typeof features, typeof rows[number]>[] = [
        {
            header: "Provider",
            accessorKey: "provider",
            cell: ({ row: { original } }) => (
                <span className="flex items-center gap-2 font-medium capitalize">
                    <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: colors.get(original.provider) }}
                    />
                    {original.provider}
                </span>
            ),
        },
        {
            header: "Requests",
            accessorKey: "count",
            cell: ({ row: { original } }) => (
                <span className="tabular-nums">
                    {formatNumber(original.count)}
                </span>
            ),
        },
        {
            accessorKey: "share",
            header: "Traffic share",
            cell: ({ row: { original } }) => formatPercent(original.share, { fractionDigits: original.share > 0 && original.share < 1 ? 2 : 1 }),
        },
        {
            accessorKey: "errors",
            header: "Failed requests",
            cell: ({ row: { original } }) => (
                <div className="flex flex-col gap-1 tabular-nums">
                    <span className={original.errors > 0 ? "text-warning" : undefined}>
                        {formatNumber(original.errors)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatPercent(original.errorRate, { maximumFractionDigits: 2 })} failure rate
                    </span>
                </div>
            ),
        },
        {
            header: "Average latency",
            accessorKey: "avgDurationMs",
            cell: ({ row: { original } }) => formatMs(original.avgDurationMs),
        },
    ];

    const table = useTable({
        columns,
        features,
        data: rows,
    });

    return (
        <section className="my-6 flex min-w-0 flex-col gap-4" aria-label="Provider requests">
            <SectionHeader
                title="Provider requests"
                description="Request volume, failure rate, and latency for the selected period."
                action={
                    <FilterSelect
                        value={data.range}
                        onChange={onRangeChange}
                        label="Provider request period"
                        options={apiRequestRangeOptions}
                    />
                }
            />
            <ChartCard
                height={230}
                hasData={total > 0}
                title="Requests by provider"
                emptyMessage="No provider requests in this period."
                description={`${formatNumber(total)} requests in this period.`}
            >
                <DataBarChart
                    y="count"
                    data={rows}
                    x="provider"
                    height={230}
                    integerYTicks
                    tooltipValueFormatter={formatNumber}
                    ariaLabel="API request volume by provider"
                    xFormatter={value => capitalize(String(value))}
                    fill={({ provider }) => colors.get(provider)!}
                />
            </ChartCard>
            <DataTable
                table={table}
                ariaLabel="Provider request statistics"
                emptyMessage={
                    <EmptyState
                        icon={Radio}
                        className="py-4"
                        message="No provider requests in this period."
                    />
                }
            />
        </section>
    );
}
