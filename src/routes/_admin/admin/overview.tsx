import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Smile, Star, UserCheck, UserPlus, Users} from "lucide-react";
import {StatCard} from "@/lib/client/components/media-stats/StatCard";
import {RecentUsers} from "@/lib/client/components/admin/RecentUsers";
import {PrivacyIcon} from "@/lib/client/components/general/MainIcons";
import {DataBarChart} from "@/lib/client/components/charts/DataBarChart";
import {DashboardShell} from "@/lib/client/components/admin/DashboardShell";
import {DashboardHeader} from "@/lib/client/components/admin/DashboardHeader";
import {adminOverviewOptions} from "@/lib/client/react-query/query-options/admin.options";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


export const Route = createFileRoute("/_admin/admin/overview")({
    context: () => ({
        overviewQueryOptions: adminOverviewOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.overviewQueryOptions);
    },
    component: OverviewPage,
});


function OverviewPage() {
    const { overviewQueryOptions } = Route.useRouteContext();
    const apiData = useSuspenseQuery(overviewQueryOptions).data;

    const newUsers = apiData.newUsers.comparedToLastMonth > 0;

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Users Overview"
                description="Overview of the user statistics and growth of MyLists."
            />
            <div className="space-y-4">
                <div className="grid gap-4 grid-cols-4 max-sm:grid-cols-2 max-sm:gap-3">
                    <StatCard
                        icon={Users}
                        title="Total Users"
                        value={apiData.totalUsers.count}
                        subtitle="Users that registered"
                    />
                    <StatCard
                        icon={UserPlus}
                        title="New Users"
                        value={apiData.newUsers.count}
                        subtitle={`${newUsers ? "+" : ""}${apiData.newUsers.comparedToLastMonth} compared to last month`}
                    />
                    <StatCard
                        icon={UserCheck}
                        title="Unique Users This Month"
                        subtitle="Unique users seen this month"
                        value={apiData.usersSeenThisMonth.count}
                    />
                    <StatCard
                        icon={Star}
                        title="Score Rating Users"
                        value={apiData.scoreRatingUsers.count}
                        subtitle="Users using the score rating system"
                    />
                    <StatCard
                        icon={Smile}
                        title="Feeling Rating Users"
                        value={apiData.feelingRatingUsers.count}
                        subtitle="Users using the feeling rating system"
                    />
                    {apiData.usersPerPrivacy.map((privacyValue) =>
                        <StatCard
                            key={privacyValue.privacy}
                            value={privacyValue.count}
                            title={capitalize(privacyValue.privacy) + " Users"}
                            subtitle={"Users with privacy set to " + privacyValue.privacy}
                            icon={<PrivacyIcon type={privacyValue.privacy} className="size-4"/>}
                        />
                    )}
                </div>
                <div className="grid gap-4 grid-cols-7 max-sm:grid-cols-2 max-sm:gap-3">
                    <Card className="col-span-4 max-sm:col-span-5">
                        <CardHeader>
                            <CardTitle>User Growth</CardTitle>
                            <CardDescription>Cumulative number of users per month</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-3">
                            <DataBarChart
                                x="month"
                                y="count"
                                height={350}
                                fill="var(--brand)"
                                data={apiData.cumulativeUsersPerMonth}
                                ariaLabel="Cumulative users per month"
                                tooltipValueFormatter={(value) => String(value)}
                            />
                        </CardContent>
                    </Card>
                    <Card className="col-span-3 max-sm:col-span-5 pr-3">
                        <CardHeader>
                            <CardTitle>Recent Users</CardTitle>
                            <CardDescription>Latest user activity on MyLists</CardDescription>
                        </CardHeader>
                        <CardContent className="mt-3 overflow-y-auto scrollbar-thin pr-3">
                            <RecentUsers
                                users={apiData.recentUsers}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardShell>
    );
}
