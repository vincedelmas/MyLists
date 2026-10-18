import {UserRoundCheck} from "lucide-react";
import type {SearchType} from "@/lib/schemas";
import {formatDate} from "@/lib/utils/formatting/date";
import {Badge} from "@/lib/client/components/ui/badge";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {SectionHeader} from "@/lib/client/components/general/SectionHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {type ColumnDef, rowPaginationFeature, tableFeatures, useTable} from "@tanstack/react-table";
import type {AdminInactiveAccountsData} from "@/lib/client/react-query/query-options/admin.options";


type InactiveAccount = AdminInactiveAccountsData["items"][number];


const features = tableFeatures({ rowPaginationFeature });
const statuses = {
    warned: {
        variant: "info",
        label: "Awaiting deletion",
    },
    resurrected: {
        variant: "success",
        label: "Reactivated",
    },
    deleted: {
        label: "Deleted",
        variant: "destructive",
    },
    mail_failed: {
        variant: "warning",
        label: "Email failed",
    },
} as const;


export function InactiveAccountsTable({ apiData, filters }: { apiData: AdminInactiveAccountsData, filters: SearchType }) {
    const { search = "" } = filters;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search, options: { resetScroll: false } });
    const { pagination, onPaginationChange } = useTablePagination({
        page: filters.page,
        pageSize: filters.perPage ?? 25,
        onPageChange: page => updateFilters({ page }),
    });

    const columns: ColumnDef<typeof features, InactiveAccount>[] = [
        {
            header: "Account",
            accessorKey: "username",
            cell: ({ row: { original } }) => (
                <div className="flex flex-col gap-1">
                    <span className="font-medium">
                        {original.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        #{original.userId}
                    </span>
                </div>
            ),
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: ({ row: { original } }) => (
                <Badge variant={statuses[original.status].variant}>
                    {original.status === "mail_failed" && original.emailRetryCount < 3
                        ? "Retrying email"
                        : statuses[original.status].label
                    }
                </Badge>
            ),
        },
        {
            header: "Last seen",
            accessorKey: "lastSeenAt",
            cell: ({ row: { original } }) => <RelativeTime date={original.lastSeenAt}/>,
        },
        {
            header: "Warning sent",
            accessorKey: "warningSentAt",
            cell: ({ row: { original } }) => <RelativeTime date={original.warningSentAt}/>,
        },
        {
            header: "Scheduled deletion",
            accessorKey: "deletionScheduledAt",
            cell: ({ row: { original } }) => formatDate(original.deletionScheduledAt),
        },
        {
            id: "completedAt",
            header: "Completed",
            cell: ({ row: { original } }) => formatDate(original.deletedAt ?? original.resurrectedAt),
        },
        {
            header: "Warning email",
            accessorKey: "emailRetryCount",
            cell: ({ row: { original } }) => (
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                        {original.emailRetryCount} failed {original.emailRetryCount === 1 ? "attempt" : "attempts"}
                    </span>
                    <span className="block max-w-64 truncate text-xs" title={original.lastEmailError ?? undefined}>
                        {original.lastEmailError ?? DEFAULT_DASH_FALLBACK}
                    </span>
                </div>
            ),
        },
    ];

    const table = useTable({
        columns,
        features,
        onPaginationChange,
        data: apiData.items,
        manualPagination: true,
        rowCount: apiData.total,
        state: { pagination },
    });

    return (
        <section className="mb-6 flex min-w-0 flex-col gap-4" aria-label="Inactivity history">
            <SectionHeader
                title="Inactivity history"
                description="Follow warning delivery, scheduled deletions, and accounts that returned. Statistics above cover all records."
            />
            <SearchInput
                value={localSearch}
                onChange={handleInputChange}
                className="w-full sm:max-w-80"
                placeholder="Search by username…"
                aria-label="Search inactive accounts by username"
            />
            <DataTable
                table={table}
                ariaLabel="Inactive account history"
                emptyMessage={<EmptyState icon={UserRoundCheck} message={search
                    ? "No inactive accounts match your search."
                    : "No inactive account history yet."
                }/>}
            />
            <TablePagination
                table={table}
            />
        </section>
    );
}
