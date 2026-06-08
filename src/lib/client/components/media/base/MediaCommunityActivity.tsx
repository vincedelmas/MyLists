import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Button} from "@/lib/client/components/ui/button";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {ExtractFollowByType} from "@/lib/types/query.options.types";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {MediaCommunityActivityStats} from "@/lib/types/user-media.types";
import {formatAdaptiveMinutes, formatNumber} from "@/lib/utils/number-formatting";
import {MediaFollowCard} from "@/lib/client/components/media/base/MediaFollowCard";
import {mediaCommunityActivityOptions} from "@/lib/client/react-query/query-options";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/lib/client/components/ui/tooltip";
import {ChevronDown, CircleHelp, Clock, Heart, RotateCcw, Star, Users} from "lucide-react";


type MediaCommunityActivityQuery = Awaited<ReturnType<NonNullable<ReturnType<typeof mediaCommunityActivityOptions>["queryFn"]>>>;
type CommunityActivityItem = MediaCommunityActivityQuery["items"][number];


interface CommunityActivityProps {
    mediaId: number;
    mediaType: MediaType;
}


export const MediaCommunityActivity = ({ mediaId, mediaType }: CommunityActivityProps) => {
    const isBelowSm = useBreakpoint("sm");
    const apiData = useSuspenseQuery(mediaCommunityActivityOptions(mediaId, mediaType, { page: 1, perPage: 8 })).data;

    if (!apiData.total) {
        return null;
    }

    const visibleItems = isBelowSm ? apiData.items.slice(0, 4) : apiData.items;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
                    <Users className="size-5"/>
                    Community Activity
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground transition-colors hover:text-primary mt-1">
                                <CircleHelp className="size-4"/>
                                <span className="sr-only">Community activity visibility note</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-60">
                            These data include only community profiles.
                            Private accounts are excluded, so counts and stats may vary.
                        </TooltipContent>
                    </Tooltip>
                </h2>
            </div>

            <CommunityActivityStatsGrid
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


export const CommunityActivityStatsGrid = ({ stats, mediaType }: CommunityActivityStatsProps) => {
    const activityConfig = mediaConfig[mediaType].communityActivity;

    const extraValue = stats[activityConfig.extraMetric];
    const formattedExtraValue = activityConfig.extraMetric === "totalPlaytime"
        ? formatAdaptiveMinutes(extraValue)
        : formatNumber(extraValue, { locale: "en" });

    const cards = [
        {
            icon: Users,
            iconColor: "text-neutral-400",
            label: activityConfig.countLabel,
            value: formatNumber(stats.total, { locale: "en" }),
        },
        {
            icon: Star,
            label: "Avg. rating",
            iconColor: "text-app-rating",
            value: formatNumber(stats.averageRating, { locale: "en", fractionDigits: 1 }),
        },
        {
            icon: Heart,
            label: "Favorited",
            iconColor: "text-red-700 fill-red-700",
            value: formatNumber(stats.likedCount, { locale: "en" }),
        },
        {
            value: formattedExtraValue,
            iconColor: "text-app-accent",
            label: activityConfig.extraLabel,
            icon: activityConfig.extraMetric === "totalPlaytime" ? Clock : RotateCcw,
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map(({ icon: Icon, label, value, iconColor }) =>
                <div key={label} className="flex items-center gap-3 rounded-lg border bg-popover/40 p-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md">
                        <Icon className={`size-5.5 ${iconColor}`}/>
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-lg font-bold leading-tight text-primary">
                            {value}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                            {label}
                        </div>
                    </div>
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
