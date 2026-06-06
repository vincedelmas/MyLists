import {formatAvgRating} from "@/lib/utils/ratings-formatting";
import {ExtractStatsByType} from "@/lib/types/stats.types";
import {StatCard} from "@/lib/client/media-stats/StatCard";
import {DistributionChart} from "@/lib/client/media-stats/DistributionChart";
import {formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {ActivityByMonthChart} from "@/lib/client/media-stats/ActivityByMonthChart";
import {ChartColumn, Clock, Heart, MessageSquare, RefreshCw, Star, Tags, TrendingUp, Trophy, User} from "lucide-react";


interface OverviewDashboardProps {
    stats: ExtractStatsByType<undefined>;
}


export function OverviewDashboard({ stats }: OverviewDashboardProps) {
    const { ratingSystem, avgRated } = stats;
    const ratingValue = formatAvgRating(ratingSystem, avgRated);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
                {stats.totalUsers &&
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
                    subtitle={`Avg: ${formatNumber(stats.avgFavorites, { fractionDigits: 2 })}`}
                />
                <StatCard
                    title="Total Comments"
                    value={formatNumber(stats.totalComments)}
                    icon={<MessageSquare className="size-4"/>}
                    subtitle={`Avg: ${formatNumber(stats.avgComments, { fractionDigits: 2 })}`}
                />
                <StatCard
                    title="Total Updates"
                    icon={<ChartColumn className="size-4"/>}
                    value={formatNumber(stats.updatesPerMonth.totalUpdates)}
                    subtitle={`Avg: ${formatNumber(stats.updatesPerMonth.avgUpdates, { fractionDigits: 2 })}`}
                />
                <StatCard
                    title="Total Tags"
                    icon={<Tags className="size-4"/>}
                    subtitle="All media type included"
                    value={formatNumber(stats.totalTags)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                <DistributionChart
                    height={350}
                    data={stats.mediaTimeDistribution}
                    title="Time (hours) Distribution by Media"
                />
                <ActivityByMonthChart
                    stacked={true}
                    title="Activity Time by Month"
                    data={stats.activityByMonth.data}
                    mediaTypes={stats.activityByMonth.mediaTypes}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <DistributionChart
                    height={350}
                    title="Updates per Month"
                    data={stats.updatesPerMonth.updatesDistribution}
                />
            </div>
        </div>
    );
}
