import {getThemeColor} from "@/lib/client/theme";
import {RatingSystemType} from "@/lib/utils/enums";
import {getFeelingIcon} from "@/lib/client/ratings";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {ContinuePreview} from "@/lib/client/components/continue/ContinuePreview";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {ChartNoAxesColumn, Clock, ClockAlert, LibraryBig, Star} from "lucide-react";
import {ContinueItem} from "@/lib/client/react-query/query-options/continue.options";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {HighlightedMedia} from "@/lib/client/components/user-profile/HighlightedMedia";
import {DistributionContainer} from "@/lib/client/components/general/DistributionContainer";
import {MediaGlobalSummaryType, PerMediaSummaryType} from "@/lib/types/query.options.types";
import {SegmentedDistributionBar} from "@/lib/client/components/general/SegmentedDistributionBar";


interface OverviewTabProps {
    isCurrent: boolean,
    showContinue: boolean,
    perMedia: PerMediaSummaryType,
    ratingSystem: RatingSystemType,
    inProgressMedia: ContinueItem[],
    globalStats: MediaGlobalSummaryType,
    highlightedMedia: ResolvedHighlightedMediaTabConfig,
}


export const OverviewTab = ({ globalStats, perMedia, ratingSystem, highlightedMedia, inProgressMedia, isCurrent, showContinue }: OverviewTabProps) => {
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
                                icon: <Clock className="size-4"/>,
                                value: `${formatNumber(globalStats.totalDays, { fractionDigits: 0 })} d`,
                            },
                            {
                                label: "Total entries",
                                icon: <LibraryBig className="size-4"/>,
                                value: formatNumber(globalStats.totalEntries),
                            },
                            {
                                value: ratingDisplay,
                                label: "Avg. rating",
                                icon: <Star className="size-4"/>,
                            },
                            {
                                label: "Rated media",
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

            {showContinue &&
                <ContinuePreview
                    isCurrent={isCurrent}
                    items={inProgressMedia}
                />
            }

            <HighlightedMedia
                showMediaType={true}
                config={highlightedMedia}
            />
        </div>
    );
};
