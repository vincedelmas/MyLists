import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {capitalize} from "@/lib/utils/text-formatting";
import {ExtractStatsByType} from "@/lib/types/stats.types";
import {formatAvgRating} from "@/lib/utils/ratings-formatting";
import {StatCard} from "@/lib/client/components/media-stats/StatCard";
import {formatHours, formatNumber} from "@/lib/utils/number-formatting";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {ChartColumn, Clock, Heart, Play, Star, Tags} from "lucide-react";
import {RatingsChart} from "@/lib/client/components/media-stats/RatingsChart";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {HistogramChart} from "@/lib/client/components/media-stats/HistogramChart";
import {TimeSeriesChart} from "@/lib/client/components/media-stats/TimeSeriesChart";
import {StatusDistribution} from "@/lib/client/components/media-stats/StatusDistribution";
import {mediaStatsViewConfig} from "@/lib/client/components/media-stats/media-stats.config";
import {ActivityByMonthChart} from "@/lib/client/components/media-stats/ActivityByMonthChart";


interface MediaTypeDashboardProps {
    stats: ExtractStatsByType<MediaType>;
}


export function MediaTypeDashboard({ stats }: MediaTypeDashboardProps) {
    const { mediaType, ratingSystem, specificMediaStats } = stats;

    const mediaDefinition = getMediaDefinition(mediaType);
    const mediaStatsDefinition = mediaDefinition.statistics;
    const progressStatsDefinition = mediaStatsDefinition.progress;

    const ratingValue = formatAvgRating(ratingSystem, stats.avgRated);
    const { SummaryStats, AffinityStats } = mediaStatsViewConfig[mediaType];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    title="Total Entries"
                    value={formatNumber(stats.totalEntries)}
                    icon={<MainThemeIcon type={mediaType}/>}
                    subtitle={`${capitalize(mediaDefinition.terminology.entry.plural)} in list`}
                />
                <StatCard
                    title="Time Spent"
                    icon={<Clock className="size-4"/>}
                    value={formatHours(stats.timeSpentHours)}
                    subtitle={`${formatNumber(stats.timeSpentHours, { locale: "en", fractionDigits: 0 })} hours`}
                />
                {progressStatsDefinition &&
                    <StatCard
                        icon={<Play className="size-4"/>}
                        value={formatNumber(stats.totalSpecific)}
                        title={progressStatsDefinition.totalSpecificLabel}
                        subtitle={`Including ${formatNumber(stats.totalRedo)} ${progressStatsDefinition.redoLabel}`}
                    />
                }
                <StatCard
                    title="Avg. Rating"
                    value={ratingValue}
                    icon={<Star className="size-4"/>}
                    subtitle={`${formatNumber(stats.totalRated)} entries rated`}
                />
                <StatCard
                    title="Avg. Updates"
                    subtitle="Per active month"
                    icon={<ChartColumn className="size-4"/>}
                    value={formatNumber(stats.avgUpdates, { fractionDigits: 1 })}
                />
                <SummaryStats
                    stats={stats}
                />
                <StatCard
                    title="Total Favorites"
                    icon={<Heart className="size-4"/>}
                    value={formatNumber(stats.totalFavorites)}
                />
                <StatCard
                    title="Total Tags"
                    icon={<Tags className="size-4"/>}
                    value={formatNumber(specificMediaStats.totalTags)}
                />
            </div>

            <StatusDistribution
                total={stats.totalEntries}
                statuses={stats.statusesCounts}
            />

            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
                <HistogramChart
                    mediaType={mediaType}
                    data={specificMediaStats.durationDistrib}
                    unit={mediaStatsDefinition.durationDistribution.unit}
                    title={mediaStatsDefinition.durationDistribution.label}
                    rangeMode={mediaStatsDefinition.durationDistribution.rangeMode}
                />
                <ActivityByMonthChart
                    mediaType={mediaType}
                    title="Activity Time by Month"
                    data={stats.activityByMonth.data}
                    range={stats.activityByMonth.range}
                    mediaTypes={stats.activityByMonth.mediaTypes}
                />
                <HistogramChart
                    mediaType={mediaType}
                    title="Release Date Distribution"
                    data={specificMediaStats.releaseDates}
                />
                <RatingsChart
                    height={300}
                    mediaType={mediaType}
                    ratingSystem={ratingSystem}
                    ratings={specificMediaStats.ratings}
                />
            </div>

            <TimeSeriesChart
                minPeriod="2020-01"
                title="Updates by Month"
                data={stats.updatesDistribution}
                color={getThemeColor(mediaType)}
                description="From January 2020; months with at least one recorded update"
            />

            <AffinityStats
                stats={stats}
            />
        </div>
    );
}
