import {RatingSystemType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {getFeelingIcon} from "@/lib/utils/ratings-formatting";
import {ChartNoAxesColumn, Clock, ClockAlert, LibraryBig, Star} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {HighlightedMedia} from "@/lib/client/components/user-profile/HighlightedMedia";
import {DistributionContainer} from "@/lib/client/components/general/DistributionContainer";
import {MediaGlobalSummaryType, PerMediaSummaryType} from "@/lib/types/query.options.types";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {SegmentedDistributionBar} from "@/lib/client/components/general/SegmentedDistributionBar";


interface OverviewTabProps {
    perMedia: PerMediaSummaryType,
    ratingSystem: RatingSystemType,
    globalStats: MediaGlobalSummaryType,
    highlightedMedia: ResolvedHighlightedMediaTabConfig,
}


export const OverviewTab = ({ globalStats, perMedia, ratingSystem, highlightedMedia }: OverviewTabProps) => {
    const rating = globalStats.avgRated;
    const distributionTotalDays = perMedia.reduce((total, media) => total + media.timeSpentDays, 0);

    const timeSegments = distributionTotalDays > 0
        ? perMedia.map(({ mediaType, timeSpentDays }) => ({
            label: mediaType,
            color: getThemeColor(mediaType),
            percentage: (timeSpentDays / distributionTotalDays) * 100,
        }))
        : [];

    const ratingDisplay = ratingSystem === "score"
        ? formatNumber(rating, { fractionDigits: 2, locale: "en" })
        : getFeelingIcon(rating, { size: 22, className: "mt-0.5" });

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border shadow-xs">
                <div className="p-5 sm:p-6">
                    <CompactStatsGrid
                        columns={4}
                        items={[
                            {
                                label: "Total time",
                                note: "across all media",
                                icon: <Clock className="size-4"/>,
                                value: `${formatNumber(globalStats.totalDays, { fractionDigits: 0 })} d`,
                            },
                            {
                                note: "tracked media",
                                label: "Total entries",
                                icon: <LibraryBig className="size-4"/>,
                                value: formatNumber(globalStats.totalEntries),
                            },
                            {
                                value: ratingDisplay,
                                label: "Average rating",
                                note: "personal average",
                                icon: <Star className="size-4"/>,
                            },
                            {
                                label: "Rated media",
                                note: "of tracked entries",
                                icon: <ChartNoAxesColumn className="size-4"/>,
                                value: globalStats.percentRated ? formatPercent(globalStats.percentRated) : undefined,
                            },
                        ]}
                    />
                </div>

                <DistributionContainer label="Time Distribution" icon={Clock}>
                    {distributionTotalDays === 0 ?
                        <EmptyState
                            icon={ClockAlert}
                            message="No time to display yet."
                        />
                        :
                        <SegmentedDistributionBar
                            segments={timeSegments}
                            renderSegment={({ percentage }) => percentage > 5 ?
                                <span className="truncate px-0.5 text-xs font-medium tracking-wider text-black">
                                {formatPercent(percentage, { fractionDigits: 0 })}
                            </span>
                                :
                                null
                            }
                        />
                    }
                    <div className="flex w-full gap-1 mt-1 pb-2">
                        {timeSegments.map(({ label, percentage }) =>
                            <div key={label} className="basis-0 overflow-hidden" style={{ flexGrow: percentage }}>
                                {percentage > 5 &&
                                    <span className="block font-medium text-xs text-muted-foreground uppercase tracking-wider truncate">
                                    {label}
                                </span>
                                }
                            </div>
                        )}
                    </div>
                </DistributionContainer>
            </section>

            <HighlightedMedia
                showMediaType={true}
                config={highlightedMedia}
            />
        </div>
    );
};
