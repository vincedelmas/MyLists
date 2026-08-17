import {MediaType, Status} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {statusUtils} from "@/lib/utils/media-mapping";
import {capitalize} from "@/lib/utils/text-formatting";
import {ExtractStatsByType} from "@/lib/types/stats.types";
import {formatAvgRating} from "@/lib/utils/ratings-formatting";
import {StatsHero} from "@/lib/client/components/media-stats/StatsHero";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {TasteShelf} from "@/lib/client/components/media-stats/TasteShelf";
import {getMediaConfig} from "@/lib/client/components/media/media-config";
import {UpdatesDial} from "@/lib/client/components/media-stats/UpdatesDial";
import {RatingsChart} from "@/lib/client/components/media-stats/RatingsChart";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {PulseTimeline} from "@/lib/client/components/media-stats/PulseTimeline";
import {HistogramChart} from "@/lib/client/components/media-stats/HistogramChart";
import {StatsRecordList} from "@/lib/client/components/media-stats/StatsRecordList";
import {StatsMetricGrid} from "@/lib/client/components/media-stats/StatsMetricGrid";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {StatsSectionHeader} from "@/lib/client/components/media-stats/StatsSectionHeader";
import {formatContinuousTime, formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {BarChart3, CalendarDays, Check, Clock3, Heart, List, MessageCircle, Play, RefreshCcw, Star, Tags} from "lucide-react";


interface MediaTypeDashboardProps {
    stats: ExtractStatsByType<MediaType>;
}


export function MediaTypeDashboard({ stats }: MediaTypeDashboardProps) {
    const { mediaType, ratingSystem, specificMediaStats } = stats;

    const color = getThemeColor(mediaType);
    const mediaConfig = getMediaConfig(mediaType);
    const mediaDefinition = getMediaDefinition(mediaType);
    const mediaStatsDefinition = mediaDefinition.statistics;

    const comparison = mediaStatsDefinition.timeComparison;
    const noPlanStatuses: Status[] = statusUtils.getNoPlanTo();

    const experiencedEntries = stats.statusesCounts.reduce((sum, status) => {
        return noPlanStatuses.includes(status.name as Status) ? sum : sum + status.value;
    }, 0);

    const plannedEntries = stats.totalEntries - experiencedEntries;
    const completedEntries = stats.statusesCounts.find(({ name }) => name === Status.COMPLETED)?.value ?? 0;

    const completionRate = experiencedEntries ? (completedEntries / experiencedEntries) * 100 : 0;
    const ratingCoverage = experiencedEntries ? (stats.totalRated / experiencedEntries) * 100 : 0;
    const favoriteRate = experiencedEntries ? (stats.totalFavorites / experiencedEntries) * 100 : 0;

    const redoRate = experiencedEntries ? (stats.totalRedo / experiencedEntries) * 100 : 0;
    const averageHours = experiencedEntries ? stats.timeSpentHours / experiencedEntries : 0;
    const activeMonths = stats.activityByMonth.data.filter(({ total }) => total > 0).length;

    const extraStats = mediaConfig.statistics.getStatCards(stats);
    const affinityCards = mediaStatsDefinition.affinities.map(({ key, label, job }) => ({
        job,
        title: label,
        topAffinity: specificMediaStats.affinityStats[key],
    }));

    const referenceCount = stats.timeSpentHours / comparison.referenceHours;
    const secondaryCount = stats.timeSpentHours / comparison.secondaryHours;

    const ledger = [
        {
            label: "All entries",
            icon: <List className="size-4"/>,
            value: formatNumber(stats.totalEntries),
            note: `${formatNumber(plannedEntries)} planned`,
        },
        {
            label: "Started",
            icon: <Play className="size-4"/>,
            value: formatNumber(experiencedEntries),
            note: `${formatPercent(completionRate)} completed`,
        },
        {
            label: "Completed",
            icon: <Check className="size-4"/>,
            value: formatNumber(completedEntries),
            note: `${formatPercent(completionRate)} of started entries`,
        },
        {
            label: "Average rating",
            icon: <Star className="size-4"/>,
            value: formatAvgRating(ratingSystem, stats.avgRated),
            note: `${formatPercent(ratingCoverage)} of started entries rated`,
        },
        {
            label: "Time per entry",
            value: formatHours(averageHours),
            icon: <Clock3 className="size-4"/>,
            note: `${formatHours(stats.timeSpentHours)} total`,
        },
        {
            label: "Comments",
            note: "on these entries",
            value: formatNumber(stats.totalComments),
            icon: <MessageCircle className="size-4"/>,
        },
        ...extraStats.map((item) => {
            const Icon = item.icon ?? BarChart3;

            return {
                label: item.title,
                value: item.value,
                icon: <Icon className="size-4"/>,
                note: item.subtitle ?? "All time",
            };
        }),
        {
            label: "Tags",
            note: "used on these entries",
            icon: <Tags className="size-4"/>,
            value: formatNumber(specificMediaStats.totalTags),
        },
    ];

    return (
        <div className="pb-12">
            <StatsHero
                color={color}
                category={capitalize(mediaType)}
                metricLabel="Total time tracked"
                title={`${capitalize(mediaType)} statistics`}
                metricValue={formatHours(stats.timeSpentHours)}
                context={stats.scope === "platform" ? "All users" : "Personal statistics"}
                metricNote={`${formatNumber(stats.timeSpentDays, { fractionDigits: 0 })} continuous days`}
                description={stats.scope === "platform"
                    ? `Combined ${mediaType} statistics across the MyLists community.`
                    : `A summary of tracked ${mediaType}, ratings, time spent, and activity.`
                }
                decoration={
                    <MainThemeIcon
                        size={420}
                        type={mediaType}
                        className="pointer-events-none absolute right-15 -top-10 -z-10 opacity-[0.035]"
                    />
                }
            />

            <section className="border-b py-7">
                <CompactStatsGrid
                    color={color}
                    items={ledger}
                />
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="01"
                    color={color}
                    title="Time comparisons"
                    description="Approximate comparisons based on published runtimes and typical reading speeds."
                />
                <StatsMetricGrid
                    items={[
                        {
                            label: "Continuous time",
                            note: "without any breaks",
                            value: formatContinuousTime(stats.timeSpentHours),
                        },
                        {
                            note: comparison.referenceLabel,
                            label: "Famous title comparison",
                            value: `${formatNumber(referenceCount, { fractionDigits: referenceCount < 10 ? 1 : 0 })}×`,
                        },
                        {
                            note: comparison.secondaryLabel,
                            label: "Another way to count it",
                            value: formatNumber(secondaryCount, {
                                notation: secondaryCount >= 10_000 ? "compact" : "standard",
                                fractionDigits: secondaryCount < 10 ? 1 : 0,
                            }),
                        },
                    ]}
                />
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="02"
                    color={color}
                    title="Status breakdown"
                    description="The current status of every entry, including completed, in progress, dropped, and planned items."
                />
                <div className="overflow-hidden rounded-xl border p-5 sm:p-7">
                    <div className="flex h-12 gap-1 overflow-hidden rounded-md bg-muted/40">
                        {stats.statusesCounts.filter(({ value }) => value > 0).map((status) => {
                            const percentage = stats.totalEntries
                                ? (status.value / stats.totalEntries) * 100
                                : 0;

                            return (
                                <div
                                    key={status.name}
                                    title={`${status.name}: ${formatNumber(status.value)} (${formatPercent(percentage)})`}
                                    style={{ flexGrow: status.value, backgroundColor: getThemeColor(String(status.name)) }}
                                    className="flex min-w-1 basis-0 items-center justify-center overflow-hidden px-2
                                    text-center text-xs font-semibold text-black"
                                >
                                    {percentage >= 12 &&
                                        <span>
                                            {status.name}
                                            <br/>
                                            <span className="text-xs opacity-70">
                                                {formatPercent(percentage, { fractionDigits: 0 })}
                                            </span>
                                        </span>
                                    }
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                        {stats.statusesCounts.filter(({ value }) => value > 0).map((status) =>
                            <div
                                key={status.name}
                                className="flex items-center gap-3 border-l pl-3"
                                style={{ borderColor: getThemeColor(String(status.name)) }}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-medium">
                                        {status.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatPercent(stats.totalEntries ? (status.value / stats.totalEntries) * 100 : 0)}
                                    </div>
                                </div>
                                <div className="font-bold tabular-nums">
                                    {formatNumber(status.value)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="03"
                    color={color}
                    title="Progress this year"
                    description="Monthly time tracked from January to December."
                />
                <PulseTimeline
                    mediaType={mediaType}
                    activity={stats.activityByMonth.data}
                />
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="04"
                    color={color}
                    title="Ratings and distributions"
                    description="Rating frequency, entry duration, and release-year distribution."
                />
                <div className="grid gap-6 lg:grid-cols-2">
                    <RatingsChart
                        height={280}
                        mediaType={mediaType}
                        ratingSystem={ratingSystem}
                        ratings={specificMediaStats.ratings}
                    />
                    <HistogramChart
                        height={280}
                        mediaType={mediaType}
                        tailDirection="lower"
                        title="Release Year Distribution"
                        data={specificMediaStats.releaseDates}
                    />
                    <div className="lg:col-span-2">
                        <HistogramChart
                            height={300}
                            mediaType={mediaType}
                            data={specificMediaStats.durationDistrib}
                            unit={mediaStatsDefinition.durationDistribution.unit}
                            title={mediaStatsDefinition.durationDistribution.label}
                            rangeMode={mediaStatsDefinition.durationDistribution.rangeMode}
                        />
                    </div>
                </div>
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="05"
                    color={color}
                    title="Tracking activity"
                    description="The types of updates recorded for this media collection."
                />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.55fr)]">
                    <UpdatesDial
                        fingerprint={stats.updateFingerprint}
                    />
                    <StatsRecordList
                        color={color}
                        records={[
                            {
                                value: formatPercent(redoRate),
                                icon: <RefreshCcw className="size-4"/>,
                                label: mediaStatsDefinition.repeat.rateLabel,
                                note: `${formatNumber(stats.totalRedo)} ${mediaStatsDefinition.repeat.label.toLowerCase()}`,
                            },
                            {
                                label: "Favorite rate",
                                icon: <Heart className="size-4"/>,
                                value: formatPercent(favoriteRate),
                                note: `${formatNumber(stats.totalFavorites)} favorites`,
                            },
                            {
                                label: "Active months",
                                value: `${activeMonths} / 12`,
                                note: "months with tracked progress",
                                icon: <CalendarDays className="size-4"/>,
                            },
                        ]}
                    />
                </div>
            </section>

            {affinityCards.length > 0 &&
                <section className="pt-12 sm:pt-16">
                    <StatsSectionHeader
                        roomy
                        index="06"
                        color={color}
                        title="Top creators and categories"
                        description="The most common people, genres, platforms, countries, and other categories in the collection."
                    />
                    <TasteShelf
                        mediaType={mediaType}
                        categories={affinityCards}
                    />
                </section>
            }

        </div>
    );
}
