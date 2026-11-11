import React from "react";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {canShowProgress} from "@/lib/utils/media/status";
import {FollowData} from "@/lib/types/query.options.types";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {DisplayFavorite} from "@/lib/client/components/media/base/DisplayFavorite";


interface BaseMediaFollowCardProps {
    showComment?: boolean;
    followData: FollowData;
    rating: React.ReactNode;
    redoDisplay?: React.ReactNode;
    ratingDisplay?: React.ReactNode;
    mediaDetailsDisplay?: React.ReactNode;
}


export const BaseMediaFollowCard = ({ followData, rating, ratingDisplay, redoDisplay, mediaDetailsDisplay, showComment = true }: BaseMediaFollowCardProps) => {
    const activityDate = followData.userMedia.lastUpdated ?? followData.userMedia.addedAt;

    const indicators = [
        {
            key: "rating",
            content: followData.userMedia.rating !== null && (ratingDisplay ?? <DisplayRating rating={rating}/>),
        },
        {
            key: "favorite",
            content: !!followData.userMedia.favorite && (
                <span role="img" aria-label="Favorite" title="Favorite" className="flex items-center [&>svg]:fill-favorite">
                    <DisplayFavorite isFavorite={followData.userMedia.favorite}/>
                </span>
            ),
        },
        {
            key: "redo",
            content: "redo" in followData.userMedia && followData.userMedia.redo > 0 && redoDisplay,
        },
        {
            key: "comment",
            content: showComment && followData.userMedia.comment && <DisplayComment content={followData.userMedia.comment}/>,
        },
    ].filter(item => item.content);

    return (
        <div className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50">
            <Link className="shrink-0" to="/profile/$username" params={{ username: followData.name }}>
                <ProfileIcon
                    fallbackSize="text-md"
                    className="size-10 border-0"
                    user={{ image: followData.image, name: followData.name }}
                />
            </Link>
            <div className="flex min-w-0 grow flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                    <Link
                        to="/profile/$username"
                        title={followData.name}
                        params={{ username: followData.name }}
                        className="truncate text-sm font-medium text-foreground transition-colors hover:text-brand"
                    >
                        {followData.name}
                    </Link>
                    {activityDate &&
                        <RelativeTime
                            date={activityDate}
                            className="-translate-y-0.5 shrink-0 whitespace-nowrap text-[11px] leading-normal text-muted-foreground
                            no-underline hover:text-brand"
                        />
                    }
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground tabular-nums [&_svg]:size-3">
                    <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        <Badge variant="outline" className="-ml-1">
                            {followData.userMedia.status}
                        </Badge>
                        {mediaDetailsDisplay && canShowProgress(followData.userMedia.status) &&
                            <>
                                <span aria-hidden="true">·</span>
                                {mediaDetailsDisplay}
                            </>
                        }
                    </div>
                    {indicators.length > 0 &&
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <span aria-hidden="true" className="text-muted-foreground">
                                ·
                            </span>
                            <div className="flex items-center gap-2 [&>div]:text-xs [&>button]:text-xs">
                                {indicators.map(({ key, content }) =>
                                    <React.Fragment key={key}>
                                        {content}
                                    </React.Fragment>
                                )}
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
};
