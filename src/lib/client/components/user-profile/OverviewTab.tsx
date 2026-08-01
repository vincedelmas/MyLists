import {Link} from "@tanstack/react-router";
import {RatingSystemType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {getFeelingIcon} from "@/lib/utils/ratings-formatting";
import {Clock, ClockAlert, MoveRight, Star} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {SimpleStatCard} from "@/lib/client/components/user-profile/SimpleStatCard";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {HighlightedMedia} from "@/lib/client/components/user-profile/HighlightedMedia";
import {DistributionContainer} from "@/lib/client/components/general/DistributionContainer";
import {MediaGlobalSummaryType, PerMediaSummaryType} from "@/lib/types/query.options.types";
import {SegmentedDistributionBar} from "@/lib/client/components/general/SegmentedDistributionBar";


interface OverviewTabProps {
    username: string,
    perMedia: PerMediaSummaryType,
    ratingSystem: RatingSystemType,
    globalStats: MediaGlobalSummaryType,
    highlightedMedia: ResolvedHighlightedMediaTabConfig,
}


export const OverviewTab = ({ username, globalStats, perMedia, ratingSystem, highlightedMedia }: OverviewTabProps) => {
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
        : getFeelingIcon(rating, { size: 28, className: "mt-1" });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
                <SimpleStatCard
                    title="Total Time"
                    value={`${formatNumber(globalStats.totalDays, { fractionDigits: 0 })} d`}
                />
                <SimpleStatCard
                    title="Total Entries"
                    value={globalStats.totalEntries}
                />
                <SimpleStatCard
                    title="Avg. Rating"
                    value={ratingDisplay}
                    icon={<Star className="size-5 text-rating mt-1"/>}
                />
                <SimpleStatCard
                    title="Rated Media"
                    value={globalStats.percentRated ? formatPercent(globalStats.percentRated) : undefined}
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

            <HighlightedMedia
                config={highlightedMedia}
            />

            <div className="flex justify-end items-center gap-2 -mt-4 font-medium text-muted-foreground">
                <Link to="/stats/$username" params={{ username }}>
                    <div className="flex justify-end items-center gap-2">
                        Advanced Stats <MoveRight className="size-4"/>
                    </div>
                </Link>
            </div>
        </div>
    );
};
