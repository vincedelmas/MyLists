import {Link} from "@tanstack/react-router";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {RatingSystemType, Status} from "@/lib/utils/enums";
import {formatNumber} from "@/lib/utils/number-formatting";
import {getFeelingIcon} from "@/lib/utils/ratings-formatting";
import {PerMediaSummaryType} from "@/lib/types/query.options.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {BarChart3, ChartNoAxesColumn, Check, Clock, LibraryBig, Star} from "lucide-react";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {HighlightedMedia} from "@/lib/client/components/user-profile/HighlightedMedia";
import {DistributionContainer} from "@/lib/client/components/general/DistributionContainer";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {SegmentedDistributionBar} from "@/lib/client/components/general/SegmentedDistributionBar";


interface MediaStatsTabProps {
    username: string,
    ratingSystem: RatingSystemType,
    mediaSummary: PerMediaSummaryType[number],
    highlightedMedia: ResolvedHighlightedMediaTabConfig,
}


export const MediaStatsTab = ({ username, mediaSummary, ratingSystem, highlightedMedia }: MediaStatsTabProps) => {
    if (!mediaSummary) return null;

    const rating = mediaSummary.avgRated;
    const ratingDisplay = ratingSystem === "score"
        ? formatNumber(rating, { fractionDigits: 2, locale: "en" })
        : getFeelingIcon(rating, { size: 22, className: "mt-0.5" });

    const statusSegments = mediaSummary.statusList.map(({ status, percent }) => ({
        label: status,
        percentage: percent,
        color: getThemeColor(status),
    }));

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-xl border shadow-xs">
                <div className="p-5 sm:p-6">
                    <CompactStatsGrid
                        columns={4}
                        color={getThemeColor(mediaSummary.mediaType)}
                        items={[
                            {
                                icon: <LibraryBig className="size-4"/>,
                                label: `Tracked ${mediaSummary.mediaType}`,
                                value: formatNumber(mediaSummary.totalEntries),
                            },
                            {
                                label: "Time spent",
                                icon: <Clock className="size-4"/>,
                                value: `${formatNumber(mediaSummary.timeSpentDays, { fractionDigits: 0 })} d`,
                            },
                            {
                                value: ratingDisplay,
                                label: "Avg. rating",
                                icon: <Star className="size-4"/>,
                            },
                            {
                                label: "Completed",
                                icon: <Check className="size-4"/>,
                                value: formatNumber(mediaSummary.statusList.find((s) => s.status === "Completed")?.count || 0),
                            },
                        ]}
                    />
                </div>

                <DistributionContainer label="Status Distribution" icon={BarChart3} mediaType={mediaSummary.mediaType}>
                    {mediaSummary.noData ?
                        <EmptyState
                            icon={ChartNoAxesColumn}
                            message="No status to display yet."
                        />
                        :
                        <SegmentedDistributionBar
                            segments={statusSegments}
                        />
                    }
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                        {mediaSummary.statusList.map((st) =>
                            <div key={st.status} className="flex items-center gap-1.5 overflow-hidden">
                                <div className="size-2 rounded-full mt-1" style={{ backgroundColor: getThemeColor(st.status) }}/>
                                <Link
                                    to="/list/$mediaType/$username"
                                    search={{ status: [st.status] as Status[] }}
                                    params={{ mediaType: mediaSummary.mediaType, username }}
                                >
                                <span className="text-sm text-muted-foreground hover:text-brand">
                                    {st.status}{" "}
                                    <span className="text-xs">
                                        ({st.count})
                                    </span>
                                </span>
                                </Link>
                            </div>
                        )}
                    </div>
                </DistributionContainer>
            </section>

            <HighlightedMedia
                config={highlightedMedia}
            />
        </div>
    );
};
