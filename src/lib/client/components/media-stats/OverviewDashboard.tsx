import {getThemeColor} from "@/lib/utils/theme-utils";
import {capitalize} from "@/lib/utils/text-formatting";
import {ExtractStatsByType} from "@/lib/types/stats.types";
import {formatAvgRating} from "@/lib/utils/ratings-formatting";
import {StatCard} from "@/lib/client/components/media-stats/StatCard";
import {TimeSeriesChart} from "@/lib/client/components/media-stats/TimeSeriesChart";
import {formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {CategoricalBarChart} from "@/lib/client/components/media-stats/CategoricalBarChart";
import {ActivityByMonthChart} from "@/lib/client/components/media-stats/ActivityByMonthChart";
import {ChartColumn, Clock, Heart, MessageSquare, RefreshCw, Star, Tags, TrendingUp, Trophy, User} from "lucide-react";


interface OverviewDashboardProps {
    stats: ExtractStatsByType<null>;
}


export function OverviewDashboard({ stats }: OverviewDashboardProps) {
    const { ratingSystem, avgRated } = stats;
    const ratingValue = formatAvgRating(ratingSystem, avgRated);
    const averageBasis = stats.scope === "platform" ? "User" : "Media Type";

    const mediaTimeDistribution = stats.mediaTimeDistribution.map(({ name, value }) => {
        return ({ value, name: String(name), color: getThemeColor(String(name)) })
    })

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {stats.scope === "platform" &&
                    <StatCard
                        title="Total Users"
                        subtitle="Accounts Activated"
                        icon={<User className="size-4"/>}
                        value={formatNumber(stats.totalUsers)}
                    />
                }
                <StatCard
                    title="Total Entries"
                    icon={<TrendingUp className="size-4"/>}
                    value={formatNumber(stats.totalEntries)}
                    subtitle={`${formatNumber(stats.totalEntriesNoPlan)} excluding planned`}
                />
                <StatCard
                    title="Total Time"
                    icon={<Clock className="size-4"/>}
                    value={formatHours(stats.totalHours)}
                    subtitle={`${formatNumber(stats.totalHours, { fractionDigits: 0 })} hours`}
                />
                <StatCard
                    title="Avg. Rating"
                    value={ratingValue}
                    icon={<Star className="size-4"/>}
                    subtitle={`${formatNumber(stats.totalRated)} (${formatPercent(stats.percentRated)}) entries rated`}
                />
                <StatCard
                    title="Platinum Achievements"
                    subtitle="All media type included"
                    icon={<Trophy className="size-4"/>}
                    value={formatNumber(stats.platinumAchievements)}
                />
                <StatCard
                    title="Total Re-experiences"
                    subtitle="Re-watches / re-reads"
                    value={formatNumber(stats.totalRedo)}
                    icon={<RefreshCw className="size-4"/>}
                />
                <StatCard
                    title="Total Favorites"
                    icon={<Heart className="size-4"/>}
                    value={formatNumber(stats.totalFavorites)}
                    subtitle={`Avg. / ${averageBasis}: ${formatNumber(stats.avgFavorites, { fractionDigits: 0 })}`}
                />
                <StatCard
                    title="Total Comments"
                    value={formatNumber(stats.totalComments)}
                    icon={<MessageSquare className="size-4"/>}
                    subtitle={`Avg. / ${averageBasis}: ${formatNumber(stats.avgComments, { fractionDigits: 0 })}`}
                />
                <StatCard
                    title="Total Updates"
                    icon={<ChartColumn className="size-4"/>}
                    value={formatNumber(stats.updatesPerMonth.totalUpdates)}
                    subtitle={`Avg. / active month: ${formatNumber(stats.updatesPerMonth.avgUpdates, { fractionDigits: 0 })}`}
                />
                <StatCard
                    title="Total Tags"
                    icon={<Tags className="size-4"/>}
                    subtitle="All media type included"
                    value={formatNumber(stats.totalTags)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                <CategoricalBarChart
                    labelFormatter={capitalize}
                    data={mediaTimeDistribution}
                    title="Time Distribution by Media"
                    description="All Time Hours spent across each media type"
                    valueFormatter={(val) => `${formatNumber(val, { fractionDigits: 0, locale: "fr" })} hours`}
                />
                <ActivityByMonthChart
                    stacked={true}
                    title="Activity Time by Month"
                    data={stats.activityByMonth.data}
                    range={stats.activityByMonth.range}
                    mediaTypes={stats.activityByMonth.mediaTypes}
                />
            </div>

            <TimeSeriesChart
                minPeriod="2020-01"
                color="var(--brand)"
                title="Updates by Month"
                data={stats.updatesPerMonth.updatesDistribution}
                description="From January 2020; months with at least one recorded update"
            />
        </div>
    );
}
