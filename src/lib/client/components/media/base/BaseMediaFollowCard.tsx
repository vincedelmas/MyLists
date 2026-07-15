import React from "react";
import {Link} from "@tanstack/react-router";
import {FollowData} from "@/lib/types/query.options.types";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {StatusBadge} from "@/lib/client/components/general/StatusBadge";
import {RelativeTime} from "@/lib/client/components/general/RelativeTime";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {DisplayFavorite} from "@/lib/client/components/media/base/DisplayFavorite";


interface BaseMediaFollowCardProps {
    showComment?: boolean;
    followData: FollowData;
    rating: React.ReactNode;
    redoDisplay?: React.ReactNode;
    mediaDetailsDisplay?: React.ReactNode;
}


export const BaseMediaFollowCard = ({ followData, rating, redoDisplay, mediaDetailsDisplay, showComment = true }: BaseMediaFollowCardProps) => {
    const activityDate = followData.userMedia.lastUpdated ?? followData.userMedia.addedAt;

    return (
        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="shrink-0">
                <div className="flex items-center justify-center">
                    <Link to="/profile/$username" params={{ username: followData.name }}>
                        <ProfileIcon
                            fallbackSize="text-md"
                            className="size-10 border-0"
                            user={{ image: followData.image, name: followData.name }}
                        />
                    </Link>
                </div>
            </div>
            <div className="grow min-w-0">
                <div className="flex justify-between items-start gap-3">
                    <p className="text-sm font-medium text-primary truncate">
                        <Link to="/profile/$username" params={{ username: followData.name }}>
                            {followData.name}
                        </Link>
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                        {activityDate &&
                            <RelativeTime
                                date={activityDate}
                                className="max-w-20 truncate text-[11px] leading-tight text-muted-foreground no-underline hover:text-primary"
                            />
                        }
                        <StatusBadge
                            className="h-5"
                            status={followData.userMedia.status}
                        />
                    </div>
                </div>
                <div className="flex gap-x-3 text-xs text-muted-foreground mt-2">
                    {mediaDetailsDisplay}

                    <DisplayRating
                        rating={rating}
                    />

                    {!!followData.userMedia.favorite &&
                        <DisplayFavorite
                            isFavorite={followData.userMedia.favorite}
                        />
                    }

                    {redoDisplay}

                    {showComment && followData.userMedia.comment &&
                        <DisplayComment
                            content={followData.userMedia.comment}
                        />
                    }
                </div>
            </div>
        </div>
    );
};
