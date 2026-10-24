import {capitalize} from "@/lib/utils/formatting/text";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatNumber} from "@/lib/utils/formatting/number";
import {createFileRoute, Link} from "@tanstack/react-router";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {RecentUsers} from "@/lib/client/components/admin/RecentUsers";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {Plug, Smile, Star, UserCheck, UserPlus, Users} from "lucide-react";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {adminOverviewOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


export const Route = createFileRoute("/_admin/admin/overview")({
    context: () => ({
        overviewQueryOptions: adminOverviewOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.query({ ...context.overviewQueryOptions, staleTime: "static" });
    },
    component: OverviewPage,
});


function OverviewPage() {
    const { overviewQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(overviewQueryOptions).data;

    return (
        <DashboardShell>
            <PageHeader
                eyebrowIcon={Users}
                title="Users overview"
                eyebrow="Administration"
                description="Registration, activity, and account preferences across MyLists."
            />
            <section className="my-6 rounded-xl border p-5 shadow-xs sm:p-6" aria-label="User statistics">
                <CompactStatsGrid
                    columns={4}
                    items={[
                        {
                            label: "Total users",
                            icon: <Users className="size-4"/>,
                            value: formatNumber(apiData.totalUsers.count),
                        },
                        {
                            label: "New users this month",
                            icon: <UserPlus className="size-4"/>,
                            value: formatNumber(apiData.newUsers.count),
                            note: `${formatNumber(apiData.newUsers.comparedToLastMonth, { signDisplay: "exceptZero" })} compared to last month`,
                        },
                        {
                            label: "Active users this month",
                            icon: <UserCheck className="size-4"/>,
                            value: formatNumber(apiData.usersSeenThisMonth.count),
                        },
                        {
                            label: "Score ratings",
                            icon: <Star className="size-4"/>,
                            value: formatNumber(apiData.scoreRatingUsers.count),
                        },
                        {
                            label: "Feeling ratings",
                            icon: <Smile className="size-4"/>,
                            value: formatNumber(apiData.feelingRatingUsers.count),
                        },
                        ...apiData.usersPerPrivacy.map(({ privacy, count }) => ({
                            value: formatNumber(count),
                            label: `${capitalize(privacy)} profiles`,
                            icon: <PrivacyIcon type={privacy} className="size-4"/>,
                        })),
                        {
                            label: "MCP connected users",
                            icon: <Plug className="size-4"/>,
                            value: formatNumber(apiData.mcpConnectedUsers.count),
                        },
                    ]}
                />
            </section>
            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)]">
                <ChartCard
                    height={350}
                    title="User growth"
                    emptyMessage="No registrations to display yet."
                    description="Cumulative registered users by month"
                    hasData={apiData.cumulativeUsersPerMonth.length > 0}
                >
                    <DataBarChart
                        x="month"
                        y="count"
                        height={350}
                        integerYTicks
                        fill="var(--brand)"
                        tooltipValueFormatter={formatNumber}
                        ariaLabel="Cumulative users per month"
                        data={apiData.cumulativeUsersPerMonth}
                    />
                </ChartCard>
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>
                            Recently active users
                        </CardTitle>
                        <CardDescription>
                            Accounts ordered by their latest activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RecentUsers
                            users={apiData.recentUsers}
                        />
                    </CardContent>
                </Card>
            </div>
            <Card className="mt-6 min-w-0">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        MCP connected users
                        <Badge variant="secondary">
                            {formatNumber(apiData.mcpConnectedUsers.count)}
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Accounts that have authorized at least one enabled MCP client
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {apiData.mcpConnectedUsers.items.length === 0 ?
                        <EmptyState
                            icon={Plug}
                            className="py-8"
                            message="No users have an MCP connection yet."
                        />
                        :
                        <ul className="grid max-h-86 gap-3 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-2 xl:grid-cols-3">
                            {apiData.mcpConnectedUsers.items.map(user =>
                                <li key={user.id} className="min-w-0">
                                    <Link
                                        to="/profile/$username"
                                        params={{ username: user.name }}
                                        className="flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted
                                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <ProfileIcon
                                            user={user}
                                            fallbackSize="text-sm"
                                            className="size-9 shrink-0 border-2"
                                        />
                                        <span className="truncate text-sm font-medium">
                                            {user.name}
                                        </span>
                                    </Link>
                                </li>
                            )}
                        </ul>
                    }
                </CardContent>
            </Card>
        </DashboardShell>
    );
}
