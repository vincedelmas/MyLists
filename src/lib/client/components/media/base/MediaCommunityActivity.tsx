import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {ExtractFollowByType} from "@/lib/types/query.options.types";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {MediaCommunityActivityStats} from "@/lib/types/user-media.types";
import {formatMinutes, formatNumber} from "@/lib/utils/number-formatting";
import {MediaFollowCard} from "@/lib/client/components/media/base/MediaFollowCard";
import {mediaCommunityActivityOptions} from "@/lib/client/react-query/query-options";
import {MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";
import {ChevronDown, CircleHelp, Clock, Eye, Heart, RotateCcw, Star} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {useAuth} from "@/lib/client/hooks/use-auth";


type MediaCommunityActivityQuery = Awaited<ReturnType<NonNullable<ReturnType<typeof mediaCommunityActivityOptions>["queryFn"]>>>;
type CommunityActivityItem = MediaCommunityActivityQuery["items"][number];


interface CommunityActivityProps {
    mediaId: number;
    mediaType: MediaType;
}


export const MediaCommunityActivity = ({ mediaId, mediaType }: CommunityActivityProps) => {
    const { currentUser } = useAuth();
    const isBelowSm = useBreakpoint("sm");
    const apiData = useSuspenseQuery(mediaCommunityActivityOptions(
        mediaId,
        mediaType,
        currentUser?.id ?? null,
        { page: 1, perPage: 8 },
    )).data;

    if (!apiData.total) {
        return null;
    }

    const visibleItems = isBelowSm ? apiData.items.slice(0, 4) : apiData.items;

    return (
        <section className="space-y-4">
            <MediaSectionTitle title="Community Activity" className="justify-start gap-3">
                <Popover>
                    <PopoverTrigger asChild>
                        <button type="button" className="cursor-help">
                            <CircleHelp className="size-4"/>
                            <span className="sr-only">Community activity visibility note</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 px-3 py-2 text-xs" side="top">
                        These data include only community profiles.
                        Private accounts are excluded, so counts and stats may vary.
                    </PopoverContent>
                </Popover>
            </MediaSectionTitle>

            <CommunityActivityStats
                stats={apiData.stats}
                mediaType={mediaType}
            />

            <CommunityActivityList
                items={visibleItems}
                mediaType={mediaType}
            />

            {apiData.total > visibleItems.length &&
                <div className="text-end -mt-1">
                    <Button variant="ghost" size="xs" asChild>
                        <Link to="/details/$mediaType/$mediaId/community" params={{ mediaType, mediaId }}>
                            View All <ChevronDown className="size-3.5"/>
                        </Link>
                    </Button>
                </div>
            }
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

    const extraLabel = activityConfig.extraMetric === "totalPlaytime"
        ? "playtime"
        : activityConfig.countLabel === "Read" ? "reread" : "rewatched";

    const items = [
        {
            icon: Star,
            label: "community avg.",
            iconColor: "text-app-rating fill-app-rating",
            value: formatNumber(stats.averageRating, { locale: "en", fractionDigits: 1 }),
        },
        {
            icon: Eye,
            label: "tracked",
            iconColor: "text-muted-foreground",
            value: formatNumber(stats.total, { locale: "en", notation: "compact", maximumFractionDigits: 1 }),
        },
        {
            icon: Heart,
            label: "favorites",
            iconColor: "text-muted-foreground",
            value: formatNumber(stats.likedCount),
        },
        {
            label: extraLabel,
            value: formattedExtraValue,
            iconColor: "text-muted-foreground",
            icon: activityConfig.extraMetric === "totalPlaytime" ? Clock : RotateCcw,
        },
    ];

    return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-1 text-sm text-muted-foreground">
            {items.map(({ icon: Icon, label, value, iconColor }) =>
                <div key={label} className="flex min-w-0 items-center gap-1.5">
                    <Icon className={`size-4 shrink-0 ${iconColor}`}/>
                    <span className="font-semibold text-primary">{value}</span>
                    <span className="truncate">{label}</span>
                </div>
            )}
        </div>
    );
};


interface CommunityActivityListProps {
    mediaType: MediaType,
    items: CommunityActivityItem[],
    variant?: "details" | "viewAll",
}


export const CommunityActivityList = ({ items, mediaType, variant = "details" }: CommunityActivityListProps) => {
    return (
        <div className={cn("grid gap-2", variant === "viewAll" ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            {items.map((follow) =>
                <div key={follow.id} className="rounded-lg border bg-popover/20">
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
