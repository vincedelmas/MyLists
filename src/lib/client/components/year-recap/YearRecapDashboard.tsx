import {Link} from "@tanstack/react-router";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {YearRecap} from "@/lib/types/year-recap.types";
import {capitalize} from "@/lib/utils/text-formatting";
import {formatRating} from "@/lib/utils/ratings-formatting";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {StatsHero} from "@/lib/client/components/media-stats/StatsHero";
import {extractYear, formatMonthYear} from "@/lib/utils/date-formatting";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayFavorite} from "@/lib/client/components/media/base/DisplayFavorite";
import {StatsRecordList} from "@/lib/client/components/media-stats/StatsRecordList";
import {StatsMetricGrid} from "@/lib/client/components/media-stats/StatsMetricGrid";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {YearRecapTimeline} from "@/lib/client/components/year-recap/YearRecapTimeline";
import {formatHours, formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {StatsSectionHeader} from "@/lib/client/components/media-stats/StatsSectionHeader";
import {ArrowRight, CalendarCheck2, CalendarRange, CheckCircle2, Clock3, Flame, LibraryBig, RefreshCcw, Trophy,} from "lucide-react";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardLeftCorner, MediaCardMeta, MediaCardSignals, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


interface YearRecapDashboardProps {
    recap: YearRecap;
}


export function YearRecapDashboard({ recap }: YearRecapDashboardProps) {
    const color = recap.scope === "all" ? "var(--brand)" : getThemeColor(recap.scope);
    const activeMedia = recap.media[0];
    const averageActiveMonth = recap.totals.activeMonths > 0
        ? recap.totals.hours / recap.totals.activeMonths
        : 0;

    if (recap.totals.titleCount === 0) {
        return (
            <div className="grid min-h-96 place-items-center rounded-2xl border border-dashed bg-card/20 p-8 text-center">
                <div>
                    <CalendarRange className="mx-auto size-9 text-muted-foreground"/>
                    <h2 className="mt-4 text-xl font-bold">
                        No activity to include
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        This year or media selection has no visible activity. Hidden activity is not included.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-12">
            <StatsHero
                color={color}
                category="Year recap"
                metricLabel="Time tracked this year"
                metricValue={formatHours(recap.totals.hours)}
                title={<>{recap.user.name}&apos;s {recap.year}</>}
                context={recap.scope === "all" ? "All media" : recap.scope}
                metricNote={`across ${formatNumber(recap.totals.titleCount)} titles`}
                description="A record of the progress, completions, repeats, and titles preserved in MyActivity."
                decoration={
                    <>
                        <div className="pointer-events-none absolute right-0 top-1/2 -z-10 -translate-y-1/2
                        text-[15rem] font-black leading-none text-foreground/2.5 sm:text-[22rem]">
                            {String(recap.year).slice(-2)}
                        </div>
                        {recap.scope !== "all" &&
                            <MainThemeIcon
                                size={390}
                                type={recap.scope}
                                className="pointer-events-none absolute -right-12 -top-16 -z-10 opacity-[0.035]"
                            />
                        }
                    </>
                }
            />

            <section className="border-b py-7">
                <CompactStatsGrid
                    color={color}
                    items={[
                        {
                            label: "Time tracked",
                            icon: <Clock3 className="size-4"/>,
                            value: formatHours(recap.totals.hours),
                            note: `${formatNumber(recap.totals.hours, { fractionDigits: 0 })} hours`,
                        },
                        {
                            label: "Active titles",
                            note: "with visible activity",
                            icon: <LibraryBig className="size-4"/>,
                            value: formatNumber(recap.totals.titleCount),
                        },
                        {
                            label: "Completions",
                            note: "recorded during the year",
                            icon: <CheckCircle2 className="size-4"/>,
                            value: formatNumber(recap.totals.completions),
                        },
                        {
                            label: "Repeats",
                            note: "rewatches, replays, or rereads",
                            icon: <RefreshCcw className="size-4"/>,
                            value: formatNumber(recap.totals.repeats),
                        },
                    ]}
                />
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="01"
                    color={color}
                    title="The year in motion"
                    description="Monthly activity from January to December. Every value comes from visible MyActivity records."
                />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.55fr)]">
                    <YearRecapTimeline months={recap.months} color={color}/>
                    <StatsRecordList
                        color={color}
                        records={[
                            {
                                label: "Most active month",
                                icon: <Trophy className="size-4"/>,
                                value: recap.busiestMonth ? formatMonthYear(recap.busiestMonth.month) : "No data",
                                note: recap.busiestMonth ? `${formatHours(recap.busiestMonth.hours)} tracked` : undefined,
                            },
                            {
                                label: "Active months",
                                icon: <CalendarCheck2 className="size-4"/>,
                                value: `${recap.totals.activeMonths} / 12`,
                                note: "months containing visible activity",
                            },
                            {
                                label: "Longest active streak",
                                icon: <Flame className="size-4"/>,
                                value: `${recap.totals.longestActiveStreak} months`,
                                note: "consecutive active months",
                            },
                            {
                                label: "Average active month",
                                icon: <CalendarRange className="size-4"/>,
                                value: formatHours(averageActiveMonth),
                                note: "time per active month",
                            },
                        ]}
                    />
                </div>
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="02"
                    color={color}
                    title={recap.scope === "all" ? "Media mix" : `${capitalize(recap.scope)} by the numbers`}
                    description={recap.scope === "all"
                        ? "How each media type contributed to the year, measured using tracked time."
                        : `Progress and comparisons calculated only from ${recap.scope} activity.`
                    }
                />

                {recap.scope === "all" ?
                    <>
                        <div className="flex h-5 overflow-hidden rounded-sm bg-muted">
                            {recap.media.map((media) =>
                                <div
                                    key={media.mediaType}
                                    title={`${capitalize(media.mediaType)}: ${formatPercent(media.share)}`}
                                    style={{
                                        width: `${media.share}%`,
                                        backgroundColor: getThemeColor(media.mediaType),
                                    }}
                                />
                            )}
                        </div>
                        <div className="mt-6 grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                            {recap.media.map((media) =>
                                <div key={media.mediaType} className="border-l pl-4" style={{ borderColor: getThemeColor(media.mediaType) }}>
                                    <div className="flex items-center gap-2">
                                        <MainThemeIcon type={media.mediaType} size={17}/>
                                        <div className="text-sm font-bold capitalize">
                                            {media.mediaType}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-end justify-between gap-3">
                                        <div className="text-2xl font-black">
                                            {formatHours(media.hours)}
                                        </div>
                                        <div className="text-sm font-bold" style={{ color: getThemeColor(media.mediaType) }}>
                                            {formatPercent(media.share, { fractionDigits: 0 })}
                                        </div>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {formatNumber(media.titleCount)} titles
                                        · {formatNumber(media.progress, { fractionDigits: media.progress < 10 ? 1 : 0 })} {media.progressUnit}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                    :
                    <StatsMetricGrid
                        items={[
                            {
                                label: "Progress recorded",
                                note: activeMedia?.progressUnit ?? "units",
                                value: formatNumber(activeMedia?.progress, {
                                    fractionDigits: activeMedia && activeMedia.progress < 10 ? 1 : 0,
                                }),
                            },
                            {
                                label: "Famous title comparison",
                                note: recap.comparison?.referenceLabel,
                                value: `${formatNumber(recap.comparison?.referenceCount, {
                                    fractionDigits: (recap.comparison?.referenceCount ?? 0) < 10 ? 1 : 0,
                                })}×`,
                            },
                            {
                                label: "Another way to count it",
                                note: recap.comparison?.secondaryLabel,
                                value: formatNumber(recap.comparison?.secondaryCount, {
                                    notation: (recap.comparison?.secondaryCount ?? 0) >= 10_000 ? "compact" : "standard",
                                    fractionDigits: (recap.comparison?.secondaryCount ?? 0) < 10 ? 1 : 0,
                                }),
                            },
                        ]}
                    />
                }
            </section>

            <section className="pt-12 sm:pt-16">
                <StatsSectionHeader
                    index="03"
                    color={color}
                    title="Titles that defined the year"
                    description="First-time titles are shown before repeat-only titles, then ordered by favorites, rating, and tracked time."
                    aside={recap.mostRepeatedTitle &&
                        <div className="text-left sm:text-right">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Most repeated
                            </div>
                            <div className="max-w-56 truncate font-bold">
                                {recap.mostRepeatedTitle.name} · {recap.mostRepeatedTitle.repeats}×
                            </div>
                        </div>
                    }
                />
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                    {recap.topTitles.map((title, index) => {
                        const rating = formatRating(recap.user.ratingSystem, title.rating, true);

                        return (
                            <MediaCard
                                mediaType={title.mediaType}
                                key={`${title.mediaType}-${title.mediaId}`}
                                item={{ mediaId: title.mediaId, mediaName: title.name, imageCover: title.imageCover }}
                            >
                                <MediaCardLeftCorner>
                                    {String(index + 1).padStart(2, "0")}
                                </MediaCardLeftCorner>
                                <MediaCardFooter>
                                    <div className="flex min-w-0 items-end justify-between gap-1.5">
                                        <MediaCardTitle lines={2} title={title.name}>
                                            {title.name}
                                        </MediaCardTitle>
                                        {rating !== null &&
                                            <div className="shrink-0">
                                                <DisplayRating rating={rating}/>
                                            </div>
                                        }
                                    </div>
                                    <MediaCardMeta>
                                        <MediaCardDetails>
                                            <span>{extractYear(title.releaseDate)}</span>
                                            {recap.scope === "all" && <span>{capitalize(title.mediaType)}</span>}
                                        </MediaCardDetails>
                                        {title.favorite &&
                                            <MediaCardSignals>
                                                <DisplayFavorite isFavorite/>
                                            </MediaCardSignals>
                                        }
                                    </MediaCardMeta>
                                </MediaCardFooter>
                            </MediaCard>
                        );
                    })}
                </div>
                <div className="mt-6 flex justify-end">
                    <Link
                        to="/activity/$username"
                        params={{ username: recap.user.name }}
                        className={buttonVariants({ variant: "outline", className: "w-fit" })}
                        search={{ year: String(recap.year), month: "1", view: "year", activeTab: recap.scope }}
                    >
                        View all activity from {recap.year}
                        <ArrowRight/>
                    </Link>
                </div>
            </section>

        </div>
    );
}
