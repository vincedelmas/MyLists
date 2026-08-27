import {SearchType} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatPercent} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {StatCard} from "@/lib/client/components/media-stats/StatCard";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {formatDate, formatRelativeTime} from "@/lib/utils/date-formatting";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {Activity, CheckCircle2, MailWarning, Trash2, UsersRound} from "lucide-react";
import {ColumnDef, rowPaginationFeature, tableFeatures, useTable} from "@tanstack/react-table";
import {inactiveAccountDeletionsAdminOptions} from "@/lib/client/react-query/query-options/admin.options";


export const Route = createFileRoute("/_admin/admin/inactive-accounts")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        inactiveAccountsQueryOptions: inactiveAccountDeletionsAdminOptions(search),
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.inactiveAccountsQueryOptions);
    },
    component: InactiveAccountsPage,
});


const features = tableFeatures({ rowPaginationFeature });
const DEFAULT = { search: "", page: 1 } satisfies SearchType;


function StatusBadge({ status, retryCount }: { status: string, retryCount: number }) {
    if (status === "mail_failed" && retryCount < 3) {
        return <Badge variant="warning">Retrying</Badge>;
    }

    switch (status) {
        case "warned":
            return <Badge variant="info">Warned</Badge>;
        case "resurrected":
            return <Badge variant="success">Resurrected</Badge>;
        case "deleted":
            return <Badge variant="destructive">Deleted</Badge>;
        case "mail_failed":
            return <Badge variant="warning">Mail failed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}


function InactiveAccountsPage() {
    const filters = Route.useSearch();
    const { search = DEFAULT.search } = filters;
    const { inactiveAccountsQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(inactiveAccountsQueryOptions).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search });
    const { pagination, onPaginationChange } = useTablePagination({
        page: filters.page,
        pageSize: filters.perPage ?? 25,
        onPageChange: (page) => updateFilters({ page }),
    });

    const columns: ColumnDef<typeof features, typeof apiData.items[0]>[] = [
        {
            accessorKey: "userId",
            header: () => <span className="text-xs">User ID</span>,
            cell: ({ row: { original } }) => original.userId,
        },
        {
            accessorKey: "username",
            header: () => <span className="text-xs">Username</span>,
            cell: ({ row: { original } }) => <span className="font-medium">{original.username}</span>,
        },
        {
            accessorKey: "status",
            header: () => <span className="text-xs">Status</span>,
            cell: ({ row: { original } }) => <StatusBadge status={original.status} retryCount={original.emailRetryCount}/>,
        },
        {
            accessorKey: "lastSeenAt",
            header: () => <span className="text-xs">Last Seen</span>,
            cell: ({ row: { original } }) => (
                <div>
                    <div>{formatDate(original.lastSeenAt)}</div>
                    <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(original.lastSeenAt)}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "warningSentAt",
            header: () => <span className="text-xs">Warning</span>,
            cell: ({ row: { original } }) => (
                <div>
                    <div>{formatDate(original.warningSentAt)}</div>
                    <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(original.warningSentAt)}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "deletionScheduledAt",
            header: () => <span className="text-xs">Scheduled Deletion</span>,
            cell: ({ row: { original } }) => (
                <div>
                    <div>{formatDate(original.deletionScheduledAt)}</div>
                    <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(original.deletionScheduledAt)}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "emailRetryCount",
            header: () => <span className="text-xs">Retries</span>,
            cell: ({ row: { original } }) => original.emailRetryCount,
        },
        {
            id: "finalDate",
            header: () => <span className="text-xs">Final Date</span>,
            cell: ({ row: { original } }) => {
                if (original.deletedAt) return formatDate(original.deletedAt);
                if (original.resurrectedAt) return formatDate(original.resurrectedAt);
                return DEFAULT_DASH_FALLBACK;
            },
        },
        {
            accessorKey: "lastEmailError",
            header: () => <span className="text-xs">Mail Error</span>,
            cell: ({ row: { original } }) => (
                <span className="block max-w-90 truncate text-xs text-muted-foreground" title={original.lastEmailError ?? undefined}>
                    {original.lastEmailError ?? DEFAULT_DASH_FALLBACK}
                </span>
            ),
        },
    ];

    const table = useTable({
        columns,
        onPaginationChange,
        state: { pagination },
        manualPagination: true,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        features,
    });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Inactive Accounts"
                description="Track warnings, reactivations, mail failures, and automated inactive account deletions."
            />

            <div className="grid grid-cols-6 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
                <StatCard
                    title="Warned"
                    icon={UsersRound}
                    subtitle="Pending deletion"
                    value={apiData.stats.warned}
                />
                <StatCard
                    title="Retrying"
                    icon={MailWarning}
                    subtitle="Retrying warning"
                    value={apiData.stats.retrying}
                />
                <StatCard
                    icon={MailWarning}
                    title="Mail Failed"
                    subtitle="Max retries reached"
                    value={apiData.stats.mailFailed}
                />
                <StatCard
                    icon={CheckCircle2}
                    title="Resurrected"
                    subtitle="Account refreshed"
                    value={apiData.stats.resurrected}
                />
                <StatCard
                    icon={Trash2}
                    title="Deleted"
                    value={apiData.stats.deleted}
                    subtitle="Deleted by inactivity"
                />
                <StatCard
                    icon={Activity}
                    title="Resurrection"
                    subtitle="Among warned"
                    value={formatPercent(apiData.stats.resurrectionRate * 100)}
                />
            </div>

            <div className="mt-6 flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2">
                <SearchInput
                    value={localSearch}
                    onChange={handleInputChange}
                    className="w-70 max-sm:w-full"
                    placeholder="Search by username..."
                />
            </div>

            <DataTable
                table={table}
                className="mt-3"
                emptyMessage="No inactive account lifecycle rows yet."
            />
            <div className="mt-3">
                <TablePagination
                    table={table}
                />
            </div>
        </DashboardShell>
    );
}
