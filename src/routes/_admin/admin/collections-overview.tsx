import React, {useMemo} from "react";
import {SearchType} from "@/lib/schemas";
import {useSuspenseQuery} from "@tanstack/react-query";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {formatNumber} from "@/lib/utils/number-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {UserStats} from "@/lib/client/components/admin/UserStats";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ChevronsUpDown, Copy, Eye, FolderKanban, Heart, UserPlus, Users} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {adminCollectionsOptions, adminCollectionsOverviewOptions} from "@/lib/client/react-query/query-options/admin-options";
import {ColumnDef, flexRender, getCoreRowModel, OnChangeFn, PaginationState, SortingState, useReactTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_admin/admin/collections-overview")({
    validateSearch: (search) => search as SearchType,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        await Promise.all([
            queryClient.ensureQueryData(adminCollectionsOverviewOptions),
            queryClient.ensureQueryData(adminCollectionsOptions(search)),
        ]);
    },
    component: AdminCollectionsOverviewPage,
});


const DEFAULT = { search: "", page: 1, sorting: "createdAt" } satisfies SearchType;


function AdminCollectionsOverviewPage() {
    const filters = Route.useSearch();
    const { search = DEFAULT.search } = filters;
    const stats = useSuspenseQuery(adminCollectionsOverviewOptions).data;
    const newCollections = stats.createdThisMonth.comparedToLastMonth > 0;
    const apiData = useSuspenseQuery(adminCollectionsOptions(filters)).data;
    const sortingState = [{ id: filters?.sorting ?? DEFAULT.sorting, desc: filters?.sortDesc === true }];
    const paginationState = { pageIndex: filters?.page ? (filters.page - 1) : 0, pageSize: filters.perPage ?? 12 };
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<SearchType>({ search, options: { resetScroll: false } });

    const onPaginationChange: OnChangeFn<PaginationState> = async (updaterOrValue) => {
        const newPagination = typeof updaterOrValue === "function" ? updaterOrValue(paginationState) : updaterOrValue;
        updateFilters({ page: newPagination.pageIndex + 1 });
    };

    const onSortingChange: OnChangeFn<SortingState> = async (updaterOrValue) => {
        const newSorting = typeof updaterOrValue === "function" ? updaterOrValue(sortingState) : updaterOrValue;
        updateFilters({ page: 1, sortDesc: newSorting[0]?.desc ?? true, sorting: newSorting[0]?.id ?? DEFAULT.sorting });
    };

    const columns: ColumnDef<typeof apiData.items[number]>[] = useMemo(() => [
        {
            accessorKey: "mediaType",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    Type <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => <MainThemeIcon size={16} type={original.mediaType}/>,
        },
        {
            accessorKey: "privacy",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    Privacy <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => <PrivacyIcon type={original.privacy} className="size-3.5"/>,
        },
        {
            accessorKey: "title",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    Collection <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => (
                <div className="truncate line-clamp-1">
                    <Link to="/collections/$collectionId" params={{ collectionId: original.id }}>
                        {original.title}
                    </Link>
                </div>
            ),
        },
        {
            accessorKey: "ownerName",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    User <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => (
                <Link to="/profile/$username" params={{ username: original.ownerName }}>
                    {original.ownerName}
                </Link>
            ),
        },
        {
            accessorKey: "itemsCount",
            header: () => <span className="text-xs">Items</span>,
            cell: ({ row: { original } }) => formatNumber(original.itemsCount),
        },
        {
            accessorKey: "viewCount",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    Views <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => formatNumber(original.viewCount),
        },
        {
            accessorKey: "likeCount",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    Likes <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => formatNumber(original.likeCount),
        },
        {
            accessorKey: "copiedCount",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    Copies <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => formatNumber(original.copiedCount),
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <Button variant="invisible" size="xs" onClick={() => column.toggleSorting()}>
                    Created <ChevronsUpDown className="size-3 text-muted-foreground"/>
                </Button>
            ),
            cell: ({ row: { original } }) => <RelativeTime date={original.createdAt}/>,
        },
    ], []);

    const table = useReactTable({
        columns,
        onSortingChange,
        onPaginationChange,
        enableSorting: true,
        manualSorting: true,
        manualFiltering: true,
        manualPagination: true,
        data: apiData.items ?? [],
        rowCount: apiData.total ?? 0,
        getCoreRowModel: getCoreRowModel(),
        state: { pagination: paginationState, sorting: sortingState },
    });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Collections Usage"
                description="Track collection creation, privacy choices, and actual engagement."
            />
            <div className="space-y-4">
                <div className="grid gap-4 grid-cols-4 max-sm:grid-cols-2 max-sm:gap-3">
                    <UserStats
                        icon={FolderKanban}
                        title="Total Collections"
                        description="All collections created"
                        value={formatNumber(stats.totalCollections)}
                    />
                    <UserStats
                        icon={UserPlus}
                        title="Created This Month"
                        value={formatNumber(stats.createdThisMonth.count)}
                        description={`${newCollections ? "+" : ""}${formatNumber(stats.createdThisMonth.comparedToLastMonth)} compared to last month`}
                    />
                    <UserStats
                        icon={Users}
                        title="Unique Creators"
                        value={formatNumber(stats.uniqueOwners)}
                        description="Users who created at least one collection"
                    />
                    <UserStats
                        icon={Eye}
                        title="Total Views"
                        value={formatNumber(stats.totalViews)}
                        description="Views across all collections"
                    />
                    <UserStats
                        icon={Heart}
                        title="Total Likes"
                        value={formatNumber(stats.totalLikes)}
                        description="Likes across all collections"
                    />
                    <UserStats
                        icon={Copy}
                        title="Total Copies"
                        value={formatNumber(stats.totalCopies)}
                        description="How often collections were copied"
                    />
                    {stats.collectionsPerPrivacy.map((pv) =>
                        <UserStats
                            key={pv.privacy}
                            value={formatNumber(pv.count)}
                            title={capitalize(pv.privacy) + " Collections"}
                            icon={<PrivacyIcon type={pv.privacy} className="size-5"/>}
                            description={"Collections with privacy set to " + pv.privacy}
                        />
                    )}
                </div>
                <div className="grid gap-4 grid-cols-7 max-sm:grid-cols-2 max-sm:gap-3">
                    <Card className="col-span-4 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>Collections Growth</CardTitle>
                            <CardDescription>Collections Created Per Month</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-3">
                            <ResponsiveContainer width="100%" height={350} className="-ml-4">
                                <BarChart data={stats.createdPerMonth}>
                                    <XAxis
                                        fontSize={12}
                                        dataKey="month"
                                        stroke="#e2e2e2"
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        stroke="#e2e2e2"
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "#374151", opacity: 0.4 }}
                                        contentStyle={{
                                            border: "none",
                                            color: "#e2e2e2",
                                            borderRadius: "6px",
                                            backgroundColor: "#111827"
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="currentColor"
                                        radius={[4, 4, 0, 0]}
                                        className="fill-gray-400"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="col-span-3 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>By Media Type</CardTitle>
                            <CardDescription>Which Lists Users Build Collections For</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {stats.collectionsPerMediaType.map((entry) =>
                                <div key={entry.mediaType} className="flex items-center font-semibold justify-between rounded-lg border px-3 py-2">
                                    <span className="flex gap-2 items-center text-sm text-muted-foreground capitalize">
                                        <MainThemeIcon type={entry.mediaType}/>{" "}
                                        {entry.mediaType}
                                    </span>
                                    <span className="text-sm">
                                        {formatNumber(entry.count)}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>All Collections</CardTitle>
                        <CardDescription>List of Every Created Collection</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2">
                            <SearchInput
                                className="w-72"
                                value={localSearch}
                                onChange={handleInputChange}
                                placeholder="Search collections or users..."
                            />
                            <div className="text-sm text-muted-foreground font-medium">
                                {apiData.total} collections
                            </div>
                        </div>
                        <div className="rounded-md border p-3 pt-0 overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) =>
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) =>
                                                <TableHead key={header.id}>
                                                    {!header.isPlaceholder && flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            )}
                                        </TableRow>
                                    )}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows.length ?
                                        table.getRowModel().rows.map((row) =>
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) =>
                                                    <TableCell key={cell.id}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        )
                                        :
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                                No collections found.
                                            </TableCell>
                                        </TableRow>
                                    }
                                </TableBody>
                            </Table>
                        </div>
                        <TablePagination
                            table={table}
                            withSelection={false}
                        />
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    );
}
