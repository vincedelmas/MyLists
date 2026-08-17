import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {ExtractStatsByType} from "@/lib/types/stats.types";
import {formatMonthYear} from "@/lib/utils/date-formatting";
import {formatAvgRating} from "@/lib/utils/ratings-formatting";
import {StatsHero} from "@/lib/client/components/media-stats/StatsHero";
import {UpdatesDial} from "@/lib/client/components/media-stats/UpdatesDial";
import {StatsRecordList} from "@/lib/client/components/media-stats/StatsRecordList";
import {ActivityTapestry} from "@/lib/client/components/media-stats/ActivityTapestry";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {StatsSectionHeader} from "@/lib/client/components/media-stats/StatsSectionHeader";
import {MediaConstellation} from "@/lib/client/components/media-stats/MediaConstellation";
import {formatContinuousTime, formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {ArrowDownRight, ArrowRight, Award, CalendarDays, Clock3, Heart, List, MessageCircle, Shapes, Star, Tags, Users} from "lucide-react";


interface OverviewDashboardProps {
    subjectName?: string;
    stats: ExtractStatsByType<null>;
    onSelectMediaType?: (mt: MediaType) => void;
}


export function OverviewDashboard({ stats, subjectName, onSelectMediaType }: OverviewDashboardProps) {
    const mediaBreakdown = [...stats.mediaBreakdown].sort((l, r) => r.timeSpentHours - l.timeSpentHours);
    const totalMediaHours = mediaBreakdown.reduce((sum, item) => sum + item.timeSpentHours, 0);

    const leadingMedia = mediaBreakdown[0];
    const totalUsers = "totalUsers" in stats ? stats.totalUsers : null;
    const activeMonths = stats.activityByMonth.data.filter(({ total }) => total > 0);
    const averageHoursPerEntry = stats.totalEntriesNoPlan ? stats.totalHours / stats.totalEntriesNoPlan : 0;
    const hoursThisYear = stats.activityByMonth.data.reduce((sum, month) => sum + month.total, 0);

    const leadingShare = leadingMedia && totalMediaHours > 0
        ? (leadingMedia.timeSpentHours / totalMediaHours) * 100
        : 0;

    const favoriteRate = stats.totalEntriesNoPlan
        ? (stats.totalFavorites / stats.totalEntriesNoPlan) * 100
        : 0;

    const redoRate = stats.totalEntriesNoPlan
        ? (stats.totalRedo / stats.totalEntriesNoPlan) * 100
        : 0;

    const peakMonth = activeMonths.reduce<(typeof activeMonths)[number] | null>((peak, month) => {
        return !peak || month.total > peak.total ? month : peak;
    }, null);

    const leadingMediaThisYear = stats.activityByMonth.mediaTypes
        .filter((mediaType) => stats.activatedMediaTypes.includes(mediaType))
        .map((mediaType) => ({
            mediaType,
            hours: stats.activityByMonth.data.reduce((sum, month) => sum + (Number(month[mediaType]) || 0), 0),
        }))
        .sort((left, right) => right.hours - left.hours)[0];

    const pageTitle = stats.scope === "platform"
        ? "Platform overview"
        : `${subjectName ?? "User"}'s statistics`;

    return (
        <div className="pb-12">
            <StatsHero
                title={pageTitle}
                category="Overview"
                metricLabel="Total time tracked"
                metricValue={formatHours(stats.totalHours)}
                context={stats.scope === "platform" ? "All users" : "All media"}
                metricNote={`${formatNumber(stats.totalDays, { fractionDigits: 0 })} days`}
                description={stats.scope === "platform"
                    ? "Combined tracking, ratings, favorites, and activity across the MyLists community."
                    : "A summary of tracked media, time spent, ratings, and recent activity."
                }
                decoration={
                    <div className="pointer-events-none absolute right-0 top-0 text-[16rem] font-black leading-none
                    text-foreground/2.5 sm:text-[24rem]">
                        00
                    </div>
                }
            />

            <section className="border-b py-7">
                <CompactStatsGrid
                    items={[
                        {
                            label: "Tracked media",
                            icon: <List className="size-4"/>,
                            value: formatNumber(stats.totalEntriesNoPlan),
                            note: `${formatNumber(stats.totalEntries - stats.totalEntriesNoPlan)} planned`,
                        },
                        {
                            label: "Average rating",
                            icon: <Star className="size-4"/>,
                            value: formatAvgRating(stats.ratingSystem, stats.avgRated),
                            note: `${formatPercent(stats.percentRated)} of entries rated`,
                        },
                        {
                            label: "Media types",
                            icon: <Shapes className="size-4"/>,
                            value: formatNumber(mediaBreakdown.length),
                            note: `avg. of ${formatHours(averageHoursPerEntry)} per tracked media`,
                        },
                        {
                            label: stats.scope === "platform" ? "Users" : "Active days",
                            note: stats.scope === "platform" ? "registered accounts" : "with at least one update",
                            value: formatNumber(stats.scope === "platform" ? totalUsers : stats.updateFingerprint.activeDays),
                            icon: stats.scope === "platform" ? <Users className="size-4"/> : <CalendarDays className="size-4"/>
                        },
                        {
                            label: "Platinum achievements",
                            icon: <Award className="size-4"/>,
                            value: formatNumber(stats.platinumAchievements),
                        },
                        {
                            label: "Tags",
                            icon: <Tags className="size-4"/>,
                            value: formatNumber(stats.totalTags),
                        },
                        {
                            label: "Comments",
                            value: formatNumber(stats.totalComments),
                            icon: <MessageCircle className="size-4"/>,
                        },
                        {
                            label: "Ratings",
                            icon: <Star className="size-4"/>,
                            value: formatNumber(stats.totalRated),
                        },
                    ]}
                />
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="01"
                    title="Media breakdown"
                    description="The size of each circle represents its share of total tracked time.
                    Select one to view its detailed stats."
                />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.55fr)]">
                    <MediaConstellation
                        media={mediaBreakdown}
                        ratingSystem={stats.ratingSystem}
                        onSelectMediaType={onSelectMediaType}
                    />
                    <div className="flex flex-col justify-between border-y py-6 lg:border-l lg:border-y-0 lg:pl-7">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Most Tracked Media Type
                            </div>
                            <div className="mt-2 text-3xl font-black capitalize">
                                {leadingMedia?.mediaType ?? "No data"}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {leadingMedia
                                    ? `${formatPercent(leadingShare)} of all tracked time.`
                                    : "No time has been tracked yet."
                                }
                            </p>
                        </div>
                        <div className="mt-8 space-y-6">
                            <div>
                                <div className="text-2xl font-black">
                                    {formatContinuousTime(stats.totalHours)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    of continuous media time
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-black">
                                    {formatNumber(stats.totalHours / 2, { notation: "compact", fractionDigits: 1 })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    two-hour viewing or playing sessions
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-black">
                                    {formatHours(averageHoursPerEntry)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    avg. time per tracked media
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="02"
                    title="Activity This Year"
                    description="Each square shows the time tracked for one media type during one month.
                    Brighter squares indicate more activity."
                />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.55fr)]">
                    <ActivityTapestry
                        data={stats.activityByMonth.data}
                        mediaTypes={stats.activatedMediaTypes}
                    />
                    <StatsRecordList
                        records={[
                            {
                                label: "Tracked this year",
                                icon: <Clock3 className="size-4"/>,
                                value: formatHours(hoursThisYear),
                                note: "from January to December",
                            },
                            {
                                label: "Most active month",
                                icon: <CalendarDays className="size-4"/>,
                                value: peakMonth ? formatMonthYear(peakMonth.month) : "No data",
                                note: peakMonth ? `${formatHours(peakMonth.total)} tracked` : "No activity recorded",
                            },
                            {
                                label: "Leading media",
                                icon: <Shapes className="size-4"/>,
                                value: leadingMediaThisYear?.hours
                                    ? capitalize(leadingMediaThisYear.mediaType)
                                    : "No data",
                                note: leadingMediaThisYear?.hours
                                    ? `${formatPercent((leadingMediaThisYear.hours / hoursThisYear) * 100)} of this year's time`
                                    : "No activity recorded",
                            },
                        ]}
                    />
                </div>
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="03"
                    title="Tracking activity"
                    description="A breakdown of list updates, including progress, status changes, ratings, comments, and favorites."
                />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.55fr)]">
                    <UpdatesDial
                        fingerprint={stats.updateFingerprint}
                    />
                    <StatsRecordList
                        records={[
                            {
                                label: "Most updated title",
                                icon: <ArrowRight className="size-4"/>,
                                value: stats.updateFingerprint.mostTouched?.mediaName ?? "No data",
                                note: stats.updateFingerprint.mostTouched
                                    ? `${formatNumber(stats.updateFingerprint.mostTouched.updates)} updates`
                                    : ""
                            },
                            {
                                label: "Repeat rate",
                                value: formatPercent(redoRate),
                                icon: <ArrowDownRight className="size-4"/>,
                                note: `${formatNumber(stats.totalRedo)} rewatches, replays, or rereads`
                            },
                            {
                                label: "Favorite rate",
                                icon: <Heart className="size-4"/>,
                                value: formatPercent(favoriteRate),
                                note: `${formatNumber(stats.totalFavorites)} favorites`
                            },
                            {
                                label: "Active months",
                                icon: <Clock3 className="size-4"/>,
                                value: `${activeMonths.length} / 12`,
                                note: "months with tracked progress",
                            },
                        ]}
                    />
                </div>
            </section>
        </div>
    );
}
