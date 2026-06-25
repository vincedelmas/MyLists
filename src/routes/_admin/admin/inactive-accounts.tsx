import React, {useMemo} from "react";
import {SearchType} from "@/lib/schemas";
import {Badge} from "@/lib/client/components/ui/badge";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {formatPercent} from "@/lib/utils/number-formatting";
import {UserStats} from "@/lib/client/components/admin/UserStats";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {formatDate, formatRelativeTime} from "@/lib/utils/date-formatting";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {Activity, CheckCircle2, Clock, MailWarning, Trash2, UsersRound} from "lucide-react";
import {inactiveAccountDeletionsAdminOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {ColumnDef, flexRender, getCoreRowModel, OnChangeFn, PaginationState, useReactTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_admin/admin/inactive-accounts")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(inactiveAccountDeletionsAdminOptions(search));
    },
    component: InactiveAccountsPage,
});


const DEFAULT = { search: "", page: 1 } satisfies SearchType;


function StatusBadge({ status, retryCount }: { status: string, retryCount: number }) {
    if (status === "mail_failed" && retryCount < 3) {
        return <Badge variant="outline" className="text-amber-600">Retrying</Badge>;
    }

    switch (status) {
        case "warned":
            return <Badge variant="outline" className="text-blue-600">Warned</Badge>;
        case "resurrected":
            return <Badge variant="outline" className="text-green-600">Resurrected</Badge>;
        case "deleted":
            return <Badge variant="outline" className="text-red-600">Deleted</Badge>;
        case "mail_failed":
            return <Badge variant="outline" className="text-red-600">Mail failed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}


function InactiveAccountsPage() {
    const filters = Route.useSearch();
    const { search = DEFAULT.search } = filters;
    const apiData = useSuspenseQuery(inactiveAccountDeletionsAdminOptions(filters)).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search });
    const paginationState = { pageIndex: filters?.page ? (filters.page - 1) : 0, pageSize: filters.perPage ?? 25 };

    const onPaginationChange: OnChangeFn<PaginationState> = async (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === "function" ? updaterOrValue(paginationState) : updaterOrValue;
        updateFilters({ page: newPagination.pageIndex + 1 });
    };

    const columns: ColumnDef<typeof apiData.items[0]>[] = useMemo(() => [
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
                    <div className="text-xs text-muted-foreground">{formatRelativeTime(original.lastSeenAt)}</div>
                </div>
            ),
        },
        {
            accessorKey: "warningSentAt",
            header: () => <span className="text-xs">Warning</span>,
            cell: ({ row: { original } }) => original.warningSentAt ? formatDate(original.warningSentAt) : "-",
        },
        {
            accessorKey: "deletionScheduledAt",
            header: () => <span className="text-xs">Scheduled Deletion</span>,
            cell: ({ row: { original } }) => formatDate(original.deletionScheduledAt),
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
                return "-";
            },
        },
        {
            accessorKey: "lastEmailError",
            header: () => <span className="text-xs">Mail Error</span>,
            cell: ({ row: { original } }) => (
                <span className="block max-w-90 truncate text-xs text-muted-foreground" title={original.lastEmailError ?? undefined}>
                    {original.lastEmailError ?? "-"}
                </span>
            ),
        },
    ], []);

    const table = useReactTable({
        columns,
        manualPagination: true,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        getCoreRowModel: getCoreRowModel(),
        onPaginationChange: onPaginationChange,
        state: { pagination: paginationState },
    });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Inactive Accounts"
                description="Track warnings, reactivations, mail failures, and automated inactive account deletions."
            />

            <div className="grid grid-cols-6 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
                <UserStats
                    title="Warned"
                    icon={UsersRound}
                    value={apiData.stats.warned}
                    description="Currently pending deletion"
                />
                <UserStats
                    title="Retrying"
                    icon={MailWarning}
                    value={apiData.stats.retrying}
                    description="Warning email not accepted yet"
                />
                <UserStats
                    icon={MailWarning}
                    title="Mail Failed"
                    value={apiData.stats.mailFailed}
                    description="Max retries reached"
                />
                <UserStats
                    icon={CheckCircle2}
                    title="Resurrected"
                    description="Timer refreshed"
                    value={apiData.stats.resurrected}
                />
                <UserStats
                    icon={Trash2}
                    title="Deleted"
                    value={apiData.stats.deleted}
                    description="Deleted by inactivity policy"
                />
                <UserStats
                    icon={Activity}
                    title="Resurrection"
                    description="Among completed/warned rows"
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
                <Button variant="outline" disabled>
                    <Clock className="size-4"/>
                    Daily maintenance
                </Button>
            </div>

            <div className="mt-3 rounded-md border p-3 pt-0 overflow-x-auto">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) =>
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header =>
                                    <TableHead key={header.id}>
                                        {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                )}
                            </TableRow>
                        )}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ?
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) =>
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                            :
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No inactive account lifecycle rows yet.
                                </TableCell>
                            </TableRow>
                        }
                    </TableBody>
                </Table>
            </div>
            <div className="mt-3">
                <TablePagination
                    table={table}
                    withSelection={false}
                />
            </div>
        </DashboardShell>
    );
}
