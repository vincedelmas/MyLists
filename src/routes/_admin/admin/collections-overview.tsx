import {getThemeColor} from "@/lib/client/theme";
import {Badge} from "@/lib/client/components/ui/badge";
import {capitalize} from "@/lib/utils/formatting/text";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {createFileRoute, Link} from "@tanstack/react-router";
import {TabNav} from "@/lib/client/components/general/TabNav";
import {DataTable} from "@/lib/client/components/general/DataTable";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {useSearchNavigate} from "@/lib/client/hooks/use-search-navigate";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {useTablePagination} from "@/lib/client/hooks/use-table-pagination";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {Copy, Eye, FolderKanban, Heart, ListFilter, Users} from "lucide-react";
import {TablePagination} from "@/lib/client/components/general/TablePagination";
import {MainThemeIcon, PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {adminListsSearchSchema, type AdminListsSearch} from "@/lib/schemas/admin.schema";
import {SortableColumnHeader} from "@/lib/client/components/general/SortableColumnHeader";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {adminListsOptions, adminListsOverviewOptions} from "@/lib/client/react-query/query-options/admin.options";
import {ColumnDef, OnChangeFn, rowPaginationFeature, rowSortingFeature, SortingState, tableFeatures, useTable} from "@tanstack/react-table";


export const Route = createFileRoute("/_admin/admin/collections-overview")({
    validateSearch: adminListsSearchSchema,
    loaderDeps: ({ search }) => ({ search }),
    context: ({ deps: { search } }) => ({
        listsQueryOptions: adminListsOptions(search),
        listsOverviewQueryOptions: adminListsOverviewOptions,
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.query({ ...context.listsOverviewQueryOptions, staleTime: "static" }),
            context.queryClient.query({ ...context.listsQueryOptions, staleTime: "static" }),
        ]);
    },
    component: AdminListsActivityPage,
});


const features = tableFeatures({ rowPaginationFeature, rowSortingFeature });
const DEFAULT = { search: "", page: 1, sorting: "createdAt" } satisfies Partial<AdminListsSearch>;


function AdminListsActivityPage() {
    const { listsOverviewQueryOptions, listsQueryOptions } = Route.useRouteContext();

    const filters = Route.useSearch();
    const { search = DEFAULT.search } = filters;
    const apiData = useSuspenseQuery(listsQueryOptions).data;
    const stats = useSuspenseQuery(listsOverviewQueryOptions).data;
    const { localSearch, handleInputChange, updateFilters } = useSearchNavigate<AdminListsSearch>({ search, options: { resetScroll: false } });

    const isDynamic = filters.listType === "dynamic";
    const sortingState = [{ id: filters.sorting ?? DEFAULT.sorting, desc: filters.sortDesc ?? true }];

    const mediaDistribution = [
        { label: "Collections", counts: stats.collectionsPerMediaType },
        { label: "Dynamic lists", counts: stats.dynamicLists.perMediaType },
    ].flatMap(({ label, counts }) => counts.map(entry => ({ ...entry, listType: label })));

    const creationData = stats.createdPerMonth.flatMap(row => [
        { month: row.month, listType: "Collections", count: row.collections },
        { month: row.month, listType: "Dynamic lists", count: row.dynamicLists },
    ]);

    const { pagination, onPaginationChange } = useTablePagination({
        page: filters.page,
        pageSize: filters.perPage ?? 12,
        onPageChange: (page) => updateFilters({ page }),
    });

    const onSortingChange: OnChangeFn<SortingState> = async (updaterOrValue) => {
        const newSorting = typeof updaterOrValue === "function" ? updaterOrValue(sortingState) : updaterOrValue;
        updateFilters({ page: 1, sortDesc: newSorting[0]?.desc ?? true, sorting: newSorting[0]?.id ?? DEFAULT.sorting });
    };

    const columns: ColumnDef<typeof features, typeof apiData.items[number]>[] = [
        {
            enableSorting: false,
            header: "Media types",
            accessorKey: "mediaTypes",
            cell: ({ row: { original } }) => (
                <div className="flex flex-wrap gap-1.5">
                    {original.mediaTypes.map(mediaType =>
                        <MainThemeIcon
                            key={mediaType}
                            type={mediaType}
                            data-icon="inline-start"
                        />
                    )}
                </div>
            ),
        },
        {
            accessorKey: "title",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    List
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <div className="truncate line-clamp-1">
                    {isDynamic ?
                        <Link to="/lists/dynamic/$listId" params={{ listId: original.id }}>
                            {original.title}
                        </Link>
                        :
                        <Link to="/lists/collections/$collectionId" params={{ collectionId: original.id }}>
                            {original.title}
                        </Link>
                    }
                </div>
            ),
        },
        {
            accessorKey: "ownerName",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Creator
                </SortableColumnHeader>
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
                <SortableColumnHeader column={column}>
                    Views
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => formatNumber(original.viewCount),
        },
        {
            accessorKey: "likeCount",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Likes
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => formatNumber(original.likeCount),
        },
        {
            accessorKey: "copiedCount",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Copies
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => formatNumber(original.copiedCount),
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Created
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => <RelativeTime date={original.createdAt}/>,
        },
        {
            accessorKey: "privacy",
            header: ({ column }) => (
                <SortableColumnHeader column={column}>
                    Visibility
                </SortableColumnHeader>
            ),
            cell: ({ row: { original } }) => (
                <span title={isDynamic ? `Inherited from owner’s ${original.privacy} profile` : capitalize(original.privacy)}>
                    <PrivacyIcon
                        className="size-3.5"
                        type={original.privacy}
                    />
                </span>
            ),
        },
    ];

    const table = useTable({
        features,
        onSortingChange,
        onPaginationChange,
        enableSorting: true,
        manualSorting: true,
        manualPagination: true,
        data: apiData.items ?? [],
        rowCount: apiData.total ?? 0,
        state: { pagination, sorting: sortingState },
        columns: isDynamic ? columns.filter(column => !("accessorKey" in column) ||
            !["itemsCount", "viewCount", "likeCount", "copiedCount"].includes(String(column.accessorKey))) : columns,
    });

    return (
        <DashboardShell>
            <PageHeader
                title="Lists activity"
                eyebrow="Administration"
                eyebrowIcon={FolderKanban}
                description="Creation and usage of collections and dynamic lists across MyLists."
            />

            <section className="my-6 rounded-xl border p-5 shadow-xs sm:p-6" aria-label="List statistics">
                <CompactStatsGrid
                    columns={4}
                    items={[
                        {
                            value: formatNumber(stats.totalCollections),
                            label: "Collections", icon: <FolderKanban className="size-4"/>,
                            note: `${formatNumber(stats.createdThisMonth.count)} new this month 
                            / ${formatNumber(stats.createdThisMonth.comparedToLastMonth, { signDisplay: "exceptZero" })}
                             vs. last month`,
                        },
                        {
                            value: formatNumber(stats.dynamicLists.total),
                            label: "Dynamic lists", icon: <ListFilter className="size-4"/>,
                            note: `${formatNumber(stats.dynamicLists.createdThisMonth)} new this month 
                            / ${formatNumber(stats.dynamicLists.comparedToLastMonth, { signDisplay: "exceptZero" })} vs. last month`,
                        },
                        {
                            label: "Collection creators",
                            icon: <Users className="size-4"/>,
                            value: formatNumber(stats.uniqueOwners),
                        },
                        {
                            label: "Dynamic list creators",
                            icon: <Users className="size-4"/>,
                            value: formatNumber(stats.dynamicLists.uniqueOwners),
                        },
                        {
                            label: "Collection Views",
                            icon: <Eye className="size-4"/>,
                            value: formatNumber(stats.totalViews),
                        },
                        {
                            label: "Collection Likes",
                            icon: <Heart className="size-4"/>,
                            value: formatNumber(stats.totalLikes),
                        },
                        {
                            label: "Collection Copies",
                            icon: <Copy className="size-4"/>,
                            value: formatNumber(stats.totalCopies),
                        },
                    ]}
                />
            </section>

            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
                <ChartCard
                    height={300}
                    title="Lists created per month"
                    emptyMessage="No lists have been created yet."
                    hasData={creationData.some(row => row.count > 0)}
                    description="Collections and dynamic lists created each month."
                    summary={creationData.map(row => ({ label: `${row.month} · ${row.listType}`, value: formatNumber(row.count) }))}
                >
                    <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="List types legend">
                        <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-brand"/>
                            Collections
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-muted-foreground"/>
                            Dynamic lists
                        </span>
                    </div>
                    <DataBarChart
                        x="month"
                        y="count"
                        z="listType"
                        height={300}
                        mode="stacked"
                        integerYTicks={true}
                        data={creationData}
                        tooltipValueFormatter={formatNumber}
                        ariaLabel="Collections and dynamic lists created per month"
                        fill={row => row.listType === "Collections" ? "var(--brand)" : "var(--muted-foreground)"}
                    />
                </ChartCard>
                <ChartCard
                    height={300}
                    title="Media mix"
                    emptyMessage="No media types to display yet."
                    hasData={mediaDistribution.some(row => row.count > 0)}
                    summary={mediaDistribution.map(row => ({ label: `${row.listType} · ${capitalize(row.mediaType)}`, value: formatNumber(row.count) }))}
                    description="Mixed collections & dynamic contribute to each selected type."
                >
                    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Media types legend">
                        {ALL_MEDIA_TYPES.map(mediaType =>
                            <span key={mediaType} className="flex items-center gap-1.5 capitalize">
                                <MainThemeIcon type={mediaType} size={14}/>
                                {mediaType}
                            </span>
                        )}
                    </div>
                    <DataBarChart
                        y="count"
                        x="listType"
                        height={300}
                        z="mediaType"
                        mode="stacked"
                        integerYTicks={true}
                        data={mediaDistribution}
                        seriesOrder={[...ALL_MEDIA_TYPES]}
                        tooltipSeriesFormatter={capitalize}
                        tooltipValueFormatter={formatNumber}
                        fill={row => getThemeColor(row.mediaType)}
                        ariaLabel="Media types across collections and dynamic lists"
                    />
                </ChartCard>
            </div>

            <Card className="my-6 min-w-0">
                <CardHeader>
                    <CardTitle>
                        Browse lists
                    </CardTitle>
                    <CardDescription>
                        Search by list title or creator. Dynamic list visibility follows the creator’s profile.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-col gap-4">
                    <TabNav
                        value={filters.listType}
                        tabs={[
                            {
                                id: "collections",
                                label: "Collections",
                                icon: <FolderKanban className="size-4"/>,
                            },
                            {
                                id: "dynamic",
                                label: "Dynamic lists",
                                icon: <ListFilter className="size-4"/>,
                            },
                        ] as const}
                        renderTrigger={(tab, props) =>
                            <Link
                                {...props}
                                resetScroll={false}
                                to="/admin/collections-overview"
                                search={{ ...filters, listType: tab.id, page: 1, sorting: "createdAt", sortDesc: true }}
                            />
                        }
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <SearchInput
                            value={localSearch}
                            aria-label="Search lists"
                            onChange={handleInputChange}
                            className="w-full sm:max-w-72"
                            placeholder="Search lists or users…"
                        />
                        <span className="text-sm text-muted-foreground">
                            {formatNumber(apiData.total)} {isDynamic ? "dynamic list" : "collection"}{apiData.total !== 1 && "s"}
                        </span>
                    </div>

                    {!isDynamic &&
                        <div className="flex flex-wrap gap-2" aria-label="Collection visibility">
                            {stats.collectionsPerPrivacy.map(({ privacy, count }) =>
                                <Badge key={privacy} variant="outline">
                                    <PrivacyIcon type={privacy}/>
                                    {capitalize(privacy)} {formatNumber(count)}
                                </Badge>
                            )}
                        </div>
                    }

                    <DataTable
                        table={table}
                        ariaLabel="Saved lists"
                        emptyMessage={isDynamic ? "No dynamic lists found." : "No collections found."}
                    />

                    <TablePagination
                        table={table}
                    />
                </CardContent>
            </Card>
        </DashboardShell>
    );
}
