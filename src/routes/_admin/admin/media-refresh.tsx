import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatDate} from "@/lib/utils/date-formatting";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {createFileRoute, Link} from "@tanstack/react-router";
import {UserStats} from "@/lib/client/components/admin/UserStats";
import {AdminMediaRefreshStatsParams} from "@/lib/types/admin.types";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {BarChart3, ExternalLink, Flame, RefreshCw, Users} from "lucide-react";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {adminMediaRefreshOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


export const Route = createFileRoute("/_admin/admin/media-refresh")({
    validateSearch: (search) => search as AdminMediaRefreshStatsParams,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(adminMediaRefreshOptions(search));
    },
    component: MediaRefreshPage,
});


const chartColors: Record<MediaType, string> = {
    series: "var(--color-series)",
    anime: "var(--color-anime)",
    movies: "var(--color-movies)",
    games: "var(--color-games)",
    books: "var(--color-books)",
    manga: "var(--color-manga)",
};


const rangeOptions = [
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "1y", label: "1 year" },
    { value: "all", label: "All time" },
] as const;


type RefreshRange = (typeof rangeOptions)[number]["value"];


function MediaRefreshPage() {
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const apiData = useSuspenseQuery(adminMediaRefreshOptions(filters)).data;

    const mediaTypes = Object.values(MediaType);
    const { topRange = "all", dailyRange = "30d" } = filters;
    const totalsByRoleMap = new Map(apiData.totalsByRole.map((row) => [row.role, Number(row.count)]));
    const totalsByTypeMap = new Map(apiData.totalsByType.map((row) => [row.mediaType, Number(row.count)]));

    const mediaTypeRows = mediaTypes
        .map((mt) => ({ mediaType: mt, count: totalsByTypeMap.get(mt) ?? 0 }))
        .sort((a, b) => b.count - a.count);

    const roleRows = Array.from(totalsByRoleMap.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count);

    const onNavigate = (params: AdminMediaRefreshStatsParams) => {
        navigate({ search: params, resetScroll: false });
    }

    return (
        <DashboardShell>
            <DashboardHeader heading="Refresh Monitoring" description="Track metadata refresh activity and spot power users."/>
            <div className="space-y-6">
                <div className="grid gap-4 grid-cols-4 max-sm:grid-cols-2">
                    <UserStats
                        icon={RefreshCw}
                        description="All time"
                        title="Total Refreshes"
                        value={formatNumber(apiData.summary.total)}
                    />
                    <UserStats
                        icon={Users}
                        title="Unique Users"
                        description="All-time refreshers"
                        value={formatNumber(apiData.summary.uniqueUsers)}
                    />
                    <UserStats
                        icon={BarChart3}
                        title="Avg / Day"
                        description="All-time average"
                        value={formatNumber(apiData.summary.avgPerDay)}
                    />
                    <UserStats
                        icon={Flame}
                        title="Busiest Day"
                        value={formatDate(apiData.summary.busiestDay)}
                        description={`Highest Daily Volume - ${apiData.summary.busiestCount}`}
                    />
                </div>

                <div className="grid gap-4 grid-cols-7 max-sm:grid-cols-2">
                    <Card className="col-span-4 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>Daily Refreshes</CardTitle>
                            <CardDescription>Stacked by media type</CardDescription>
                            <CardAction>
                                <Select value={dailyRange} onValueChange={(value: RefreshRange) => onNavigate({ dailyRange: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Range"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rangeOptions.map((opt) =>
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </CardAction>
                        </CardHeader>
                        <CardContent className="mt-2">
                            <ResponsiveContainer width="100%" height={340} className="-ml-4">
                                <BarChart data={apiData.daily}>
                                    <XAxis
                                        fontSize={12}
                                        dataKey="date"
                                        stroke="#e2e2e2"
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis stroke="#e2e2e2" fontSize={12} tickLine={false} axisLine={false}/>
                                    <Tooltip
                                        labelFormatter={(label) => `Day: ${label}`}
                                        formatter={(value) => formatNumber(Number(value))}
                                        contentStyle={{
                                            borderRadius: "8px",
                                            backgroundColor: "var(--popover)",
                                            border: "1px solid var(--border)",
                                        }}
                                    />
                                    {mediaTypes.map((mt) =>
                                        <Bar
                                            key={mt}
                                            dataKey={mt}
                                            stackId="refreshes"
                                            fill={chartColors[mt]}
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>MediaType Mix</CardTitle>
                            <CardDescription>All Time Share of refreshes per MediaType</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-2">
                            <div className="space-y-3">
                                {mediaTypeRows.map((row) => {
                                    const pct = apiData.summary.total ? Math.round((row.count / apiData.summary.total) * 100) : 0;

                                    return (
                                        <div key={row.mediaType} className="space-y-1 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium capitalize">
                                                    {row.mediaType}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatNumber(row.count)} ({formatPercent(pct, { fractionDigits: 0 })})
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted">
                                                <div
                                                    className="h-2 rounded-full"
                                                    style={{ width: `${pct}%`, backgroundColor: chartColors[row.mediaType] }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 grid-cols-7 max-sm:grid-cols-2">
                    <Card className="col-span-3 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>Role Breakdown</CardTitle>
                            <CardDescription>Refresh Volume by Role</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Refreshes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {roleRows.length === 0 &&
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground">
                                                No data yet
                                            </TableCell>
                                        </TableRow>
                                    }
                                    {roleRows.map((row) =>
                                        <TableRow key={row.role}>
                                            <TableCell className="capitalize">{row.role}</TableCell>
                                            <TableCell className="text-right">{formatNumber(row.count)}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="col-span-4 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>Top 8 Refreshers</CardTitle>
                            <CardDescription>Most Active Users</CardDescription>
                            <CardAction>
                                <Select value={topRange} onValueChange={(value: RefreshRange) => onNavigate({ topRange: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Range"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rangeOptions.map((opt) =>
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </CardAction>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Refreshes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {apiData.topUsers.length === 0 &&
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                No Refresh Activity Yet
                                            </TableCell>
                                        </TableRow>
                                    }
                                    {apiData.topUsers.map((user) =>
                                        <TableRow key={user.userId}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell className="capitalize">{user.role}</TableCell>
                                            <TableCell className="text-right">{formatNumber(user.count)}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Refreshes</CardTitle>
                        <CardDescription>
                            Latest Metadata Refresh Activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>MediaType</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Media Details</TableHead>
                                    <TableHead className="text-right">When</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {apiData.recentRefreshes.items.length === 0 &&
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            No Refresh Activity Yet
                                        </TableCell>
                                    </TableRow>
                                }
                                {apiData.recentRefreshes.items.map((row, idx) =>
                                    <TableRow key={`${row.userId}-${row.apiId}-${idx}`}>
                                        <TableCell className="capitalize flex items-center gap-3">
                                            <MainThemeIcon type={row.mediaType} size={16}/>
                                            {row.mediaType}
                                        </TableCell>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell className="capitalize">{row.role}</TableCell>
                                        <TableCell>
                                            <Link
                                                search={{ external: true }}
                                                to="/details/$mediaType/$mediaId"
                                                className="flex items-center gap-2"
                                                params={{ mediaType: row.mediaType, mediaId: row.apiId }}
                                            >
                                                Details <ExternalLink className="size-3.5"/>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            <RelativeTime date={row.refreshedAt}/>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={apiData.recentRefreshes.page}
                            totalPages={apiData.recentRefreshes.pages}
                            onChangePage={(page) => onNavigate({ recentPage: page })}
                        />
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    );
}
