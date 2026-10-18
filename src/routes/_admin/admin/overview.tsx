import {capitalize} from "@/lib/utils/formatting/text";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {formatNumber} from "@/lib/utils/formatting/number";
import {Smile, Star, UserCheck, UserPlus, Users} from "lucide-react";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {RecentUsers} from "@/lib/client/components/admin/RecentUsers";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {ChartCard} from "@/lib/client/components/media-stats/ChartCard";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
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
        </DashboardShell>
    );
}
