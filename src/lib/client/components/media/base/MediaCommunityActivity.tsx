import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {getThemeColor} from "@/lib/client/theme";
import {useSuspenseQuery} from "@tanstack/react-query";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {buttonVariants} from "@/lib/client/components/ui/button";
import {ExtractFollowByType} from "@/lib/types/query.options.types";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {MediaCommunityActivityStats} from "@/lib/types/user-media.types";
import {formatMinutes, formatNumber} from "@/lib/utils/formatting/number";
import {ArrowUpRight, Clock, Eye, Heart, RotateCcw, Star} from "lucide-react";
import {AggregateRating} from "@/lib/client/components/media/base/AggregateRating";
import {MediaFollowCard} from "@/lib/client/components/media/base/MediaFollowCard";
import {mediaCommunityActivityOptions} from "@/lib/client/react-query/query-options";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";


type CommunityActivityItem = MediaCommunityActivityQuery["items"][number];
type MediaCommunityActivityQuery = Awaited<ReturnType<NonNullable<ReturnType<typeof mediaCommunityActivityOptions>["queryFn"]>>>;


interface CommunityActivityProps {
    mediaId: number;
    mediaType: MediaType;
    queryOptions: ReturnType<typeof mediaCommunityActivityOptions>;
}


export const MediaCommunityActivity = ({ mediaId, mediaType, queryOptions }: CommunityActivityProps) => {
    const isBelowSm = useBreakpoint("sm");
    const apiData = useSuspenseQuery(queryOptions).data;

    if (!apiData.total) {
        return null;
    }

    const visibleItems = isBelowSm ? apiData.items.slice(0, 4) : apiData.items;

    return (
        <section>
            <MediaSectionTitle title="Community Activity" className="justify-start gap-2">
                <InfoPopover side="top" label="Community activity visibility note">
                    These data include only community profiles.
                    Private accounts are excluded, so counts and stats may vary.
                </InfoPopover>
            </MediaSectionTitle>

            <div className="flex flex-col gap-4">
                <CommunityActivityStats
                    stats={apiData.stats}
                    mediaType={mediaType}
                />

                <CommunityActivityList
                    items={visibleItems}
                    mediaType={mediaType}
                />

                {apiData.total > visibleItems.length &&
                    <div className="text-end -mt-2">
                        <Link
                            params={{ mediaType, mediaId }}
                            to="/details/$mediaType/$mediaId/community"
                            className={buttonVariants({ variant: "hover", size: "sm" })}
                        >
                            View all
                            <ArrowUpRight data-icon="inline-end"/>
                        </Link>
                    </div>
                }
            </div>
        </section>
    );
};


interface CommunityActivityStatsProps {
    mediaType: MediaType;
    stats: MediaCommunityActivityStats;
}


export const CommunityActivityStats = ({ stats, mediaType }: CommunityActivityStatsProps) => {
    if (!stats.total) return null;

    const activityConfig = mediaConfig[mediaType].communityActivity;
    const extraValue = stats[activityConfig.extraMetric];

    const formattedExtraValue = activityConfig.extraMetric === "totalPlaytime"
        ? formatMinutes(extraValue)
        : formatNumber(extraValue, { locale: "en", notation: "compact", maximumFractionDigits: 1 });

    const items = [
        {
            label: "Avg. rating",
            icon: <Star className="size-4"/>,
            value: (
                <AggregateRating label="community rating">
                    {formatNumber(stats.averageRating, { locale: "en", fractionDigits: 1 })}
                </AggregateRating>
            ),
        },
        {
            label: "Tracked",
            icon: <Eye className="size-4"/>,
            value: formatNumber(stats.total, { locale: "en", notation: "compact", maximumFractionDigits: 1 }),
        },
        {
            label: "Favorites",
            icon: <Heart className="size-4"/>,
            value: formatNumber(stats.likedCount),
        },
        {
            value: formattedExtraValue,
            label: activityConfig.extraLabel,
            icon: activityConfig.extraMetric === "totalPlaytime"
                ? <Clock className="size-4"/>
                : <RotateCcw className="size-4"/>,
        },
    ];

    return (
        <CompactStatsGrid
            items={items}
            color={getThemeColor(mediaType)}
        />
    );
};


interface CommunityActivityListProps {
    mediaType: MediaType,
    items: CommunityActivityItem[],
    variant?: "details" | "viewAll",
}


export const CommunityActivityList = ({ items, mediaType, variant = "details" }: CommunityActivityListProps) => {
    return (
        <div className={cn("grid items-start gap-2", variant === "viewAll" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
            {items.map((follow) =>
                <div key={follow.id} className="min-w-0 rounded-lg border bg-popover/20">
                    <MediaFollowCard
                        showComment={false}
                        mediaType={mediaType}
                        followData={follow as ExtractFollowByType<MediaType>}
                    />
                </div>
            )}
        </div>
    );
};
