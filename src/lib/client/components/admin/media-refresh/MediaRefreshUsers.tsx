import {Users} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {capitalize} from "@/lib/utils/formatting/text";
import {formatNumber} from "@/lib/utils/formatting/number";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {FilterSelect} from "@/lib/client/components/general/FilterSelect";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {type ColumnDef, tableFeatures, useTable} from "@tanstack/react-table";
import {mediaRefreshRangeOptions} from "@/lib/client/components/admin/monitoring-options";
import type {AdminMediaRefreshData} from "@/lib/client/react-query/query-options/admin.options";


const features = tableFeatures({});


export function MediaRefreshUsers({ data, onRangeChange }: { data: AdminMediaRefreshData, onRangeChange: (value: AdminMediaRefreshData["topRange"]) => void }) {
    const columns: ColumnDef<typeof features, AdminMediaRefreshData["topUsers"][number]>[] = [
        {
            header: "Account",
            accessorKey: "name",
            cell: ({ row: { original } }) => (
                <Link to="/profile/$username"
                      params={{ username: original.name }}
                      className="font-medium hover:underline underline-offset-4"
                >
                    {original.name}
                </Link>
            ),
        },
        {
            header: "Role",
            accessorKey: "role",
            cell: ({ row: { original } }) => capitalize(original.role)
        },
        {
            header: "Refreshes",
            accessorKey: "count",
            cell: ({ row: { original } }) => (
                <span className="tabular-nums">
                    {formatNumber(original.count)}
                </span>
            ),
        },
    ];

    const table = useTable({ features, columns, data: data.topUsers });

    return (
        <section className="my-6 flex min-w-0 flex-col gap-6" aria-label="Refresh contributors">
            <SectionHeader
                title="Top contributors"
                description="The eight accounts with the most metadata refreshes in this period."
                action={
                    <FilterSelect
                        value={data.topRange}
                        onChange={onRangeChange}
                        label="Top contributor period"
                        options={mediaRefreshRangeOptions}
                    />
                }
            />
            <DataTable
                table={table}
                ariaLabel="Top refresh contributors"
                emptyMessage={
                    <EmptyState
                        icon={Users}
                        className="py-4"
                        message="No refresh contributors in this period."
                    />
                }
            />
        </section>
    );
}
