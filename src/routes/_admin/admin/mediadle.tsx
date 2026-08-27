import {SearchType} from "@/lib/schemas";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatDateTime} from "@/lib/utils/date-formatting";
import {formatNumber} from "@/lib/utils/number-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {adminMediadleOptions} from "@/lib/client/react-query/query-options/admin.options";
import {ColumnDef, rowPaginationFeature, tableFeatures, useTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_admin/admin/mediadle")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(adminMediadleOptions(search));
    },
    component: AdminMediadlePage,
})


const features = tableFeatures({ rowPaginationFeature });
const DEFAULT = { search: "", page: 1 } satisfies SearchType;


function AdminMediadlePage() {
    const filters = Route.useSearch();
    const { search = DEFAULT.search } = filters;
    const apiData = useSuspenseQuery(adminMediadleOptions(filters)).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search });
    const { pagination, onPaginationChange } = useTablePagination({
        pageSize: 25,
        page: filters.page,
        onPageChange: (page) => updateFilters({ search, page }),
    });

    const mediadleColumns: ColumnDef<typeof features, typeof apiData.items[0]>[] = [
        {
            accessorKey: "name",
            header: "Username",
            cell: ({ row: { original } }) => {
                return (
                    <div className="flex items-center gap-3">
                        <ProfileIcon
                            fallbackSize="text-sm"
                            className="size-9 border-2"
                            user={{ image: original.image, name: original.name }}
                        />
                        <div>
                            <Link to="/profile/$username" params={{ username: original.name }} className="hover:underline hover:underline-offset-2">
                                {original.name}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                                {original.email}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: "Registered",
            cell: ({ row: { original } }) => formatDateTime(original.createdAt),
        },
        {
            accessorKey: "updatedAt",
            header: "Last Seen",
            cell: ({ row: { original } }) => formatDateTime(original.updatedAt),
        },
        {
            accessorKey: "averageAttempts",
            header: "Avg. Attempts",
            cell: ({ row: { original } }) => (
                <div className="text-center">
                    {formatNumber(original?.averageAttempts, { fractionDigits: 1, locale: "en" })}
                </div>
            ),
        },
        {
            accessorKey: "streak",
            header: "Streak",
            cell: ({ row: { original } }) => (
                <div className="text-center">{original.streak}</div>
            ),
        },
        {
            accessorKey: "bestStreak",
            header: "Best Streak",
            cell: ({ row: { original } }) => (
                <div className="text-center">{original.bestStreak}</div>
            ),
        },
        {
            accessorKey: "totalPlayed",
            header: "Total Played",
            cell: ({ row: { original } }) => (
                <div className="text-center">{original.totalPlayed}</div>
            ),
        },
        {
            accessorKey: "totalWon",
            header: "Total Won",
            cell: ({ row: { original } }) => (
                <div className="text-center">
                    {original.totalWon}
                </div>
            ),
        },
    ];

    const table = useTable({
        onPaginationChange,
        state: { pagination },
        manualPagination: true,
        columns: mediadleColumns,
        data: apiData?.items ?? [],
        rowCount: apiData?.total ?? 0,
        features,
    });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Mediadle Stats"
                description="View all users moviedle stats."
            />
            <div className="flex items-center justify-between mb-3 max-sm:flex-col max-sm:items-start max-sm:justify-center">
                <SearchInput
                    className="w-64"
                    value={localSearch}
                    onChange={handleInputChange}
                    placeholder="Search by name..."
                />
            </div>

            <DataTable
                table={table}
            />

            <div className="mt-3">
                <TablePagination
                    table={table}
                />
            </div>
        </DashboardShell>
    );
}
