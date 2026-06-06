import {Link} from "@tanstack/react-router";
import {RatingSystemType} from "@/lib/utils/enums";
import {getFeelingIcon} from "@/lib/utils/ratings-formatting";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {Clock, ClockAlert, MoveRight, Star} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {SimpleStatCard} from "@/lib/client/components/user-profile/SimpleStatCard";
import {HighlightedMedia} from "@/lib/client/components/user-profile/HighlightedMedia";
import {DistributionContainer} from "@/lib/client/components/user-profile/ProfileDistrib";
import {MediaGlobalSummaryType, PerMediaSummaryType} from "@/lib/types/query.options.types";


interface OverviewTabProps {
    username: string,
    perMedia: PerMediaSummaryType,
    ratingSystem: RatingSystemType,
    globalStats: MediaGlobalSummaryType,
    highlightedMedia: ResolvedHighlightedMediaTabConfig,
}


export const OverviewTab = ({ username, globalStats, perMedia, ratingSystem, highlightedMedia }: OverviewTabProps) => {
    const rating = globalStats.avgRated;
    const ratingDisplay = ratingSystem === "score"
        ? formatNumber(rating, {
            fractionDigits: 2,
            locale: "en",
        })
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
                    icon={<Star className="size-5 text-app-rating mt-1"/>}
                />
                <SimpleStatCard
                    title="Rated Media"
                    value={globalStats.percentRated ? formatPercent(globalStats.percentRated) : undefined}
                />
            </div>

            <DistributionContainer label="Time Distribution" icon={Clock}>
                {globalStats.totalDays === 0 ?
                    <EmptyState
                        icon={ClockAlert}
                        message="No time to display yet."
                    />
                    :
                    <div className="flex w-full gap-0.5 h-5 rounded-sm overflow-hidden bg-background">
                        {perMedia.map((media) => {
                            const percentage = (media.timeSpentDays / globalStats.totalDays) * 100;
                            if (percentage <= 0) return null;

                            return (
                                <div
                                    key={media.mediaType}
                                    className="h-full flex items-center justify-center transition-all"
                                    title={`${media.mediaType}: ${formatPercent(percentage)}`}
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: getThemeColor(media.mediaType),
                                    }}
                                >
                                    {percentage > 5 &&
                                        <span className="text-xs truncate tracking-wider font-medium text-black px-0.5">
                                        {formatPercent(percentage, { fractionDigits: 0 })}
                                    </span>
                                    }
                                </div>
                            );
                        })}
                    </div>
                }
                <div className="flex w-full gap-1 mt-1 pb-2">
                    {perMedia.map((media) => {
                        const percentage = (media.timeSpentDays / globalStats.totalDays) * 100;

                        return (
                            <div key={media.mediaType} className="overflow-hidden" style={{ width: `${percentage}%` }}>
                                {percentage > 5 &&
                                    <span className="block font-medium text-xs text-muted-foreground uppercase tracking-wider truncate">
                                        {media.mediaType}
                                    </span>
                                }
                            </div>
                        );
                    })}
                </div>
            </DistributionContainer>

            <HighlightedMedia
                config={highlightedMedia}
            />

            <div className="flex justify-end items-center gap-2 -mt-4 font-semibold text-muted-foreground">
                <Link to="/stats/$username" params={{ username }}>
                    <div className="flex justify-end items-center gap-2">
                        Advanced Stats <MoveRight className="size-4"/>
                    </div>
                </Link>
            </div>
        </div>
    );
};
