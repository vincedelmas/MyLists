import {Link} from "@tanstack/react-router";
import {getFeelingIcon} from "@/lib/utils/ratings-formatting";
import {getThemeColor} from "@/lib/utils/theme-utils";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {RatingSystemType, Status} from "@/lib/utils/enums";
import {PerMediaSummaryType} from "@/lib/types/query.options.types";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {BarChart3, ChartNoAxesColumn, MoveRight, Star} from "lucide-react";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {SimpleStatCard} from "@/lib/client/components/profile/SimpleStatCard";
import {HighlightedMedia} from "@/lib/client/components/profile/HighlightedMedia";
import {DistributionContainer} from "@/lib/client/components/profile/ProfileDistrib";


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
        ? formatNumber(rating, {
            fractionDigits: 2,
            locale: "en",
        })
        : getFeelingIcon(rating, { size: 28, className: "mt-1" });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
                <SimpleStatCard
                    title="Entries"
                    value={mediaSummary.totalEntries}
                />
                <SimpleStatCard
                    title="Time (Days)"
                    value={formatNumber(mediaSummary.timeSpentDays, { fractionDigits: 0 })}
                />
                <SimpleStatCard
                    title="Avg. Rating"
                    value={ratingDisplay}
                    icon={<Star className="size-5 text-app-rating mt-1"/>}
                />
                <SimpleStatCard
                    title="Completed"
                    value={mediaSummary.statusList.find((s) => s.status === "Completed")?.count || 0}
                />
            </div>

            <DistributionContainer label="Status Distribution" icon={BarChart3}>
                {mediaSummary.noData ?
                    <EmptyState
                        icon={ChartNoAxesColumn}
                        message="No status to display yet."
                    />
                    :
                    <div className="flex gap-0.5 h-5 rounded-sm overflow-hidden bg-background">
                        {mediaSummary.statusList.map((status) =>
                            <div
                                key={status.status}
                                className="h-full flex items-center justify-center"
                                title={`${status.status}: ${formatPercent(status.percent)}`}
                                style={{ width: `${status.percent}%`, backgroundColor: getThemeColor(status.status) }}
                            />
                        )}
                    </div>
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
                                <span className="text-sm font-medium text-muted-foreground hover:text-app-accent">
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

            <HighlightedMedia
                config={highlightedMedia}
            />

            <div className="flex justify-end items-center gap-2 -mt-4 font-semibold text-muted-foreground">
                <Link to="/stats/$username" params={{ username }} search={{ activeTab: mediaSummary.mediaType }}>
                    <div className="flex justify-end items-center gap-2">
                        Advanced Stats <MoveRight className="size-4"/>
                    </div>
                </Link>
            </div>
        </div>
    );
};
