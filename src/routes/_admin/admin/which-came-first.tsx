import {fold} from "@tanstack/charts";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {Badge} from "@/lib/client/components/ui/badge";
import {useSuspenseQuery} from "@tanstack/react-query";
import {WCF_MAX_ROUNDS} from "@/lib/schemas/wcf.schema";
import {createFileRoute, Link} from "@tanstack/react-router";
import {StatCard} from "@/lib/client/components/media-stats/StatCard";
import {formatDate, formatDateTime} from "@/lib/utils/date-formatting";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {Activity, CircleGauge, GitCompareArrows, Target, Users} from "lucide-react";
import {adminWhichCameFirstOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/lib/client/components/ui/table";


type WcfRunStatus = "active" | "won" | "lost" | "exhausted" | "abandoned";
type AdminWcfStats = Awaited<ReturnType<NonNullable<typeof adminWhichCameFirstOptions.queryFn>>>;


export const Route = createFileRoute("/_admin/admin/which-came-first")({
    context: () => ({
        whichCameFirstQueryOptions: adminWhichCameFirstOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.whichCameFirstQueryOptions);
    },
    component: AdminWhichCameFirstPage,
});


const statusChartKeys = ["won", "lost", "abandoned", "exhausted", "active"] as const satisfies readonly WcfRunStatus[];


const statusChartColors: Record<WcfRunStatus, string> = {
    won: "#45b29d",
    lost: "#df5a49",
    exhausted: "#efc94c",
    abandoned: "#71717a",
    active: "var(--brand)",
};


function AdminWhichCameFirstPage() {
    const { whichCameFirstQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(whichCameFirstQueryOptions).data;
    const dailyRuns = fold(apiData.dailyRuns, { fields: statusChartKeys, as: { key: "status", value: "count" } });

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Which Came First Stats"
                description="Track WCF play volume, pool health, score outcomes, and top players."
            />

            <div className="space-y-6">
                <Card className="relative overflow-hidden ring-brand/20">
                    <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-brand/10 blur-3xl"/>
                    <CardContent className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
                        <div>
                            <div
                                className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10
                                px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                                <GitCompareArrows className="size-3.5"/>
                                Game telemetry
                            </div>
                            <h3 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                {formatNumber(apiData.summary.playedRuns, { locale: "en" })} played sessions
                                across {formatNumber(apiData.summary.uniquePlayers, { locale: "en" })} players
                            </h3>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                                A played session means the user answered at least one round.
                                Latest session started {formatDateTime(apiData.summary.lastRunAt)}.
                                All-time accuracy is{" "}
                                {formatPercent(apiData.summary.accuracy, { fractionDigits: 1 })} over{" "}
                                {formatNumber(apiData.summary.totalAnswers, { locale: "en" })} answered rounds.
                            </p>
                        </div>
                        <div className="rounded-2xl border bg-background/70 p-5 shadow-sm backdrop-blur">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Longest Streak
                            </div>
                            <div className="mt-3 flex items-end gap-2">
                                <span className="text-6xl font-black leading-none text-brand">
                                    {apiData.summary.bestScore}
                                </span>
                                <span className="pb-2 text-sm text-muted-foreground">/ {WCF_MAX_ROUNDS}</span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Best consecutive correct answers before a miss or the hard stop.
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-lg bg-muted/60 p-3">
                                    <p className="text-muted-foreground">
                                        Reached cap
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {formatPercent(apiData.summary.capRate, { fractionDigits: 1 })}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-muted/60 p-3">
                                    <p className="text-muted-foreground">
                                        Open
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {formatNumber(apiData.summary.openRuns, { locale: "en" })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
                    <StatCard
                        icon={Activity}
                        title="Played Sessions"
                        value={formatNumber(apiData.summary.playedRuns, { locale: "en" })}
                        subtitle={`${formatNumber(apiData.summary.startedRuns, { locale: "en" })} sessions started total`}
                    />
                    <StatCard
                        icon={Users}
                        title="Unique Players"
                        value={formatNumber(apiData.summary.uniquePlayers, { locale: "en" })}
                        subtitle="Users who answered at least one round"
                    />
                    <StatCard
                        icon={Target}
                        title="Answer Accuracy"
                        value={formatPercent(apiData.summary.accuracy, { fractionDigits: 1 })}
                        subtitle={`${formatNumber(apiData.summary.correctAnswers, { locale: "en" })} correct answers`}
                    />
                    <StatCard
                        icon={CircleGauge}
                        title="Average Final Score"
                        subtitle="Ended played sessions only"
                        value={formatNumber(apiData.summary.averageScore, { locale: "en", fractionDigits: 1 })}
                    />
                </div>

                <div className="grid gap-4 grid-cols-7 max-lg:grid-cols-1">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Played Sessions</CardTitle>
                            <CardDescription>Last 30 days, requiring at least one answered round.</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-2">
                            <DataBarChart
                                x="date"
                                y="count"
                                z="status"
                                height={330}
                                mode="stacked"
                                showGrid={true}
                                data={dailyRuns}
                                seriesOrder={statusChartKeys}
                                ariaLabel="Played sessions over the last 30 days"
                                tooltipTitleFormatter={(value) => `Day: ${value}`}
                                tooltipValueFormatter={(value) => formatNumber(value, { locale: "en" })}
                                fill={({ status }) => statusChartColors[status]}
                                tooltipSeriesFormatter={(series) => getStatusLabel(series as WcfRunStatus)}
                            />
                        </CardContent>
                    </Card>

                    <StatusBreakdownCard rows={apiData.runsByStatus}/>
                </div>

                <div className="grid gap-4 grid-cols-7 max-lg:grid-cols-1">
                    <MediaTypeMixCard rows={apiData.mediaTypeUsage}/>
                    <PoolCoverageCard rows={apiData.poolByType}/>
                </div>

                <div className="grid gap-4 grid-cols-7 max-lg:grid-cols-1">
                    <TopPlayersCard rows={apiData.topPlayers}/>
                    <RecentRunsCard rows={apiData.recentRuns}/>
                </div>
            </div>
        </DashboardShell>
    );
}


function StatusBreakdownCard({ rows }: { rows: AdminWcfStats["runsByStatus"] }) {
    const total = rows.reduce((sum, row) => sum + row.count, 0);

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Outcome Mix</CardTitle>
                <CardDescription>Played sessions by current or final status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {rows.map((row) => {
                    const pct = total > 0 ? (row.count / total) * 100 : 0;

                    return (
                        <div key={row.status} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 font-medium">
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{ backgroundColor: statusChartColors[row.status] }}
                                    />
                                    {getStatusLabel(row.status)}
                                </span>
                                <span className="text-muted-foreground">
                                    {formatNumber(row.count, { locale: "en" })} · {formatPercent(pct, { fractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted">
                                <div
                                    className="h-2 rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: statusChartColors[row.status] }}
                                />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}


function MediaTypeMixCard({ rows }: { rows: AdminWcfStats["mediaTypeUsage"] }) {
    const totalAppearances = rows.reduce((sum, row) => sum + row.roundAppearances, 0);

    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Media Mix</CardTitle>
                <CardDescription>Round appearances by media type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {rows.map((row) => {
                    const pct = totalAppearances > 0 ? (row.roundAppearances / totalAppearances) * 100 : 0;

                    return (
                        <div key={row.mediaType} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex items-center gap-2 font-medium capitalize">
                                    <MainThemeIcon type={row.mediaType} size={16}/>
                                    {row.mediaType}
                                </span>
                                <span className="text-right text-xs text-muted-foreground">
                                    {formatNumber(row.roundAppearances, { locale: "en" })} rounds · {formatNumber(row.selectedCount, { locale: "en" })} selected
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted">
                                <div
                                    className="h-2 rounded-full"
                                    style={{ width: `${pct}%`, backgroundColor: getThemeColor(row.mediaType) }}
                                />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}


function PoolCoverageCard({ rows }: { rows: AdminWcfStats["poolByType"] }) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Curated Pool Coverage</CardTitle>
                <CardDescription>Current playable catalog size and release-date span.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Media Type</TableHead>
                            <TableHead className="text-right">Pool Items</TableHead>
                            <TableHead className="text-right">Date Span</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) =>
                            <TableRow key={row.mediaType}>
                                <TableCell className="flex items-center gap-2 font-medium capitalize">
                                    <MainThemeIcon type={row.mediaType} size={16}/>
                                    {row.mediaType}
                                </TableCell>
                                <TableCell className="text-right">{formatNumber(row.count, { locale: "en" })}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                    {formatDate(row.oldestReleaseDate)} → {formatDate(row.newestReleaseDate)}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


function TopPlayersCard({ rows }: { rows: AdminWcfStats["topPlayers"] }) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Top Players</CardTitle>
                <CardDescription>Ranked by longest streak, cap reaches, and average final score.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="text-right">Played</TableHead>
                            <TableHead className="text-right">Longest</TableHead>
                            <TableHead className="text-right">Avg</TableHead>
                            <TableHead className="text-right">Accuracy</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 &&
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No WCF runs yet.
                                </TableCell>
                            </TableRow>
                        }
                        {rows.map((row) =>
                            <TableRow key={row.userId}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <ProfileIcon
                                            fallbackSize="text-xs"
                                            className="size-8 border-2 shadow-sm"
                                            user={{ name: row.name, image: row.image }}
                                        />
                                        <div>
                                            <Link
                                                to="/profile/$username"
                                                params={{ username: row.name }}
                                                className="font-medium hover:underline hover:underline-offset-2"
                                            >
                                                {row.name}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                {row.wins} cap reaches · {row.activeRuns} open
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{formatNumber(row.runsPlayed, { locale: "en" })}</TableCell>
                                <TableCell className="text-right font-semibold">{row.bestScore}</TableCell>
                                <TableCell className="text-right">{formatNumber(row.averageScore, { locale: "en", fractionDigits: 1 })}</TableCell>
                                <TableCell className="text-right">{formatPercent(row.accuracy, { fractionDigits: 1 })}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


function RecentRunsCard({ rows }: { rows: AdminWcfStats["recentRuns"] }) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Recent Runs</CardTitle>
                <CardDescription>Latest WCF sessions started by users, including still-open sessions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Streak</TableHead>
                            <TableHead className="text-right">Started</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 &&
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No WCF runs yet.
                                </TableCell>
                            </TableRow>
                        }
                        {rows.map((row) =>
                            <TableRow key={row.id}>
                                <TableCell>
                                    <div>
                                        <Link
                                            to="/profile/$username"
                                            params={{ username: row.name }}
                                            className="font-medium hover:underline hover:underline-offset-2"
                                        >
                                            {row.name}
                                        </Link>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {row.selectedMediaTypes.slice(0, 3).map((mediaType) =>
                                                <MainThemeIcon key={mediaType} type={mediaType} size={13}/>
                                            )}
                                            {row.selectedMediaTypes.length > 3 &&
                                                <span className="text-[10px] text-muted-foreground">
                                                    +{row.selectedMediaTypes.length - 3}
                                                </span>
                                            }
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={row.status}/>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {row.score}/{WCF_MAX_ROUNDS}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                    {formatDateTime(row.startedAt)}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


function StatusBadge({ status }: { status: WcfRunStatus }) {
    return (
        <Badge variant="outline" className={getStatusBadgeClass(status)}>
            {getStatusLabel(status)}
        </Badge>
    );
}


const getStatusBadgeClass = (status: WcfRunStatus) => {
    switch (status) {
        case "won":
            return "border-success/30 bg-success/10 text-success";
        case "lost":
            return "border-destructive/30 bg-destructive/10 text-destructive";
        case "exhausted":
            return "border-warning/30 bg-warning/10 text-warning";
        case "active":
            return "border-brand/30 bg-brand/10 text-brand";
        case "abandoned":
        default:
            return "border-muted-foreground/30 bg-muted text-muted-foreground";
    }
};


const getStatusLabel = (status: WcfRunStatus) => {
    switch (status) {
        case "won":
            return "Reached cap";
        case "active":
            return "Open";
        case "lost":
            return "Lost";
        case "exhausted":
            return "Pool exhausted";
        case "abandoned":
        default:
            return "Abandoned";
    }
};
