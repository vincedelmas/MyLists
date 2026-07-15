import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {UserStats} from "@/lib/client/components/admin/UserStats";
import {formatMs, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {Pagination} from "@/lib/client/components/general/Pagination";
import {formatDate, formatDateTime} from "@/lib/utils/date-formatting";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {Activity, AlertTriangle, BarChart3, Clock, Gauge, Radio} from "lucide-react";
import {AdminApiMonitoringParams, ApiMonitoringRange} from "@/lib/types/admin.types";
import {adminApiMonitoringOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {EmptyState} from "@/lib/client/components/general/EmptyState";


export const Route = createFileRoute("/_admin/admin/api-monitoring")({
    validateSearch: (search) => search as AdminApiMonitoringParams,
    loaderDeps: ({ search }) => ({ search }),
    loader: async ({ context: { queryClient }, deps: { search } }) => {
        return queryClient.ensureQueryData(adminApiMonitoringOptions(search));
    },
    component: ApiMonitoringPage,
});


const providerColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--color-games)",
    "var(--color-movies)",
    "var(--color-books)",
];

const rangeOptions = [
    { value: "24h", label: "24 hours" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "all", label: "All time" },
] as const;

const dailyRangeOptions = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "all", label: "All time" },
] as const;


const formatPerSecond = (value: number) => {
    if (value > 0 && value < 0.0001) return "<0.0001";
    return formatNumber(value, { maximumFractionDigits: 4 });
};


function ApiMonitoringPage() {
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const apiData = useSuspenseQuery(adminApiMonitoringOptions(filters)).data;

    const totalErrors = apiData.summary.failed;
    const { range = "30d", dailyRange = "30d" } = filters;
    const errorRate = apiData.summary.total ? (totalErrors / apiData.summary.total) * 100 : 0;
    const selectedProviderRange = rangeOptions.find((opt) => opt.value === range)?.label ?? "Selected range";
    const selectedDailyRange = dailyRangeOptions.find((opt) => opt.value === dailyRange)?.label ?? "Selected range";
    const providerMixTotal = apiData.totalsByProvider.reduce((total, row) => total + Number(row.count), 0);
    const providerColorMap = new Map(apiData.providers.map((provider, idx) => [provider, providerColors[idx % providerColors.length]]));

    const onNavigate = (params: AdminApiMonitoringParams) => {
        navigate({ search: { ...filters, ...params }, resetScroll: false });
    };

    return (
        <DashboardShell>
            <DashboardHeader heading="API Monitoring" description="Track outbound provider traffic, quotas, latency, errors, and bursts."/>
            <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                            All-time overview
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Lifetime metrics for all providers, including errors, avg. latency, and peak traffic.
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 grid-cols-6 max-xl:grid-cols-3 max-sm:grid-cols-2">
                    <UserStats
                        title="Total Calls"
                        description="Lifetime volume"
                        value={formatNumber(apiData.summary.total)}
                        icon={<Radio className="text-app-accent size-5"/>}
                    />
                    <UserStats
                        title="Avg. / Day"
                        description="Since monitoring began"
                        icon={<BarChart3 className="text-app-accent size-5"/>}
                        value={formatNumber(apiData.summary.avgPerDay, { maximumFractionDigits: 1 })}
                    />
                    <UserStats
                        title="Avg. / Sec"
                        description="Since monitoring began"
                        icon={<Gauge className="text-app-accent size-5"/>}
                        value={formatPerSecond(apiData.summary.avgPerSecond)}
                    />
                    <UserStats
                        title="Max Burst"
                        description="Max peak in one sec."
                        icon={<Activity className="text-app-accent size-5"/>}
                        value={formatNumber(apiData.summary.busiestSecondCount)}
                    />
                    <UserStats
                        title="Errors"
                        value={formatNumber(totalErrors)}
                        icon={<AlertTriangle className="text-app-accent size-5"/>}
                        description={`${formatPercent(errorRate)} lifetime failure rate`}
                    />
                    <UserStats
                        title="Avg. Latency"
                        description="All calls, all providers"
                        value={formatMs(apiData.summary.avgDurationMs)}
                        icon={<Clock className="text-app-accent size-5"/>}
                    />
                </div>
                <div className="grid gap-4 grid-cols-7 max-sm:grid-cols-2">
                    <Card className="col-span-4 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>Daily Provider Calls</CardTitle>
                            <CardDescription>{selectedDailyRange} · daily volume stacked by provider</CardDescription>
                            <CardAction>
                                <Select
                                    value={dailyRange}
                                    onValueChange={(value: Exclude<ApiMonitoringRange, "24h">) => onNavigate({ dailyRange: value })}
                                >
                                    <SelectTrigger aria-label="Daily Provider Calls range">
                                        <SelectValue placeholder="Select Range"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dailyRangeOptions.map((opt) =>
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
                                    {apiData.providers.map((provider) =>
                                        <Bar
                                            key={provider}
                                            dataKey={provider}
                                            stackId="api-calls"
                                            fill={providerColorMap.get(provider)}
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>Provider Mix</CardTitle>
                            <CardDescription>
                                {selectedProviderRange} · share, errors, and avg. latency
                            </CardDescription>
                            <CardAction>
                                <Select value={range} onValueChange={(value: ApiMonitoringRange) => onNavigate({ range: value })}>
                                    <SelectTrigger aria-label="Provider Mix range">
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
                            <div className="space-y-3">
                                {apiData.totalsByProvider.length === 0 &&
                                    <EmptyState
                                        icon={Radio}
                                        className="py-4"
                                        message="No provider calls in this range"
                                    />
                                }
                                {apiData.totalsByProvider.map((row) => {
                                    const count = Number(row.count);
                                    const pct = providerMixTotal ? (count / providerMixTotal) * 100 : 0;

                                    return (
                                        <div key={row.provider} className="space-y-1 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-medium capitalize">
                                                    {row.provider}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatNumber(count)} ({formatPercent(pct, { fractionDigits: pct > 0 && pct < 1 ? 1 : 0 })})
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted">
                                                <div
                                                    className="h-2 rounded-full"
                                                    style={{ width: `${pct}%`, backgroundColor: providerColorMap.get(row.provider) }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>
                                                    {formatNumber(row.errors)}{" "}
                                                    ({formatPercent((row.errors / (count ?? 1)), { fractionDigits: 3 })}){" "}
                                                    errors
                                                </span>
                                                <span>{formatMs(Number(row.avgDurationMs ?? 0))} avg</span>
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
                            <CardTitle>Burst Details</CardTitle>
                            <CardDescription>All-time traffic peaks and latency</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Busiest day</TableCell>
                                        <TableCell className="text-right">
                                            {formatDate(apiData.summary.busiestDay)} - {formatNumber(apiData.summary.busiestDayCount)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Busiest second</TableCell>
                                        <TableCell className="text-right">
                                            {formatDateTime(apiData.summary.busiestSecond, { seconds: true })} - {formatNumber(apiData.summary.busiestSecondCount)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Busiest minute</TableCell>
                                        <TableCell className="text-right">
                                            {formatDateTime(apiData.summary.busiestMinute)} - {formatNumber(apiData.summary.busiestMinuteCount)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Avg latency</TableCell>
                                        <TableCell className="text-right">{formatMs(apiData.summary.avgDurationMs)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="col-span-4 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>Status Breakdown</CardTitle>
                            <CardDescription>All-time HTTP status volume</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Calls</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {apiData.statusTotals.length === 0 &&
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-muted-foreground">
                                                No data yet
                                            </TableCell>
                                        </TableRow>
                                    }
                                    {apiData.statusTotals.map((row) =>
                                        <TableRow key={row.status ?? "network-error"}>
                                            <TableCell>{row.status ?? "Network Error"}</TableCell>
                                            <TableCell className="text-right">{formatNumber(Number(row.count))}</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Provider Rollups</CardTitle>
                        <CardDescription>Latest flushed minute buckets</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Calls</TableHead>
                                    <TableHead>Errors</TableHead>
                                    <TableHead>Avg Latency</TableHead>
                                    <TableHead>Max Burst</TableHead>
                                    <TableHead className="text-right">Bucket</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {apiData.recentCalls.items.length === 0 &&
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No provider rollups yet
                                        </TableCell>
                                    </TableRow>
                                }
                                {apiData.recentCalls.items.map((row) =>
                                    <TableRow key={row.id}>
                                        <TableCell className="capitalize">{row.provider}</TableCell>
                                        <TableCell>{formatNumber(row.total)}</TableCell>
                                        <TableCell>{formatNumber(row.errors)}</TableCell>
                                        <TableCell>{formatMs(Math.round(row.durationMsTotal / Math.max(row.total, 1)))}</TableCell>
                                        <TableCell>{formatNumber(row.maxSecondBurst)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            <RelativeTime date={row.bucketStart}/>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Pagination
                            currentPage={apiData.recentCalls.page}
                            totalPages={apiData.recentCalls.pages}
                            onChangePage={(page) => onNavigate({ recentPage: page })}
                        />
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    );
}
