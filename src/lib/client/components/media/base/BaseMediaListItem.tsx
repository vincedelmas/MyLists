import {Check} from "lucide-react";
import React, {useState} from "react";
import {MediaType, Status} from "@/lib/utils/enums";
import {canShowProgress} from "@/lib/utils/media/status";
import type {UserMediaItem} from "@/lib/types/query.options.types";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {DisplayFavorite} from "@/lib/client/components/media/base/DisplayFavorite";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {MediaCardEditAction} from "@/lib/client/components/media/base/MediaCardEditAction";
import {
    MediaCard,
    MediaCardBadge,
    MediaCardFooter,
    MediaCardLeftCorner,
    MediaCardMeta,
    MediaCardRightCorner,
    MediaCardSignals,
    MediaCardTitle,
} from "@/lib/client/components/media/base/MediaCard";


interface BaseMediaListItemProps {
    rank?: number;
    isCurrent: boolean;
    isConnected: boolean;
    mediaType: MediaType;
    showMediaType?: boolean;
    rating: React.ReactNode;
    userMedia: UserMediaItem;
    isMediaTypeActive: boolean;
    annotation?: string | null;
    redoDisplay?: React.ReactNode;
    allStatuses: readonly Status[];
    onEdited?: () => Promise<void>;
    ratingDisplay?: React.ReactNode;
    mediaDetailsDisplay?: React.ReactNode;
}


export const BaseMediaListItem = (props: BaseMediaListItemProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const {
        rank, rating, onEdited, mediaType, userMedia, isCurrent, annotation, redoDisplay, isConnected,
        allStatuses, showMediaType, ratingDisplay, isMediaTypeActive, mediaDetailsDisplay,
    } = props;

    const isCommon = isMediaTypeActive && userMedia.common;
    const showMediaDetails = mediaDetailsDisplay && canShowProgress(userMedia.status);

    const hasMetadata = userMedia.rating !== null || !!(annotation || userMedia.comment || userMedia.favorite)
        || ("redo" in userMedia && !!userMedia.redo);

    return (
        <>
            <MediaCard item={userMedia} mediaType={mediaType}>
                {(rank !== undefined || showMediaDetails) &&
                    <MediaCardLeftCorner>
                        {rank !== undefined && <span>#{rank}</span>}
                        {showMediaDetails && mediaDetailsDisplay}
                    </MediaCardLeftCorner>
                }

                {isConnected && (isCurrent || !isCommon) &&
                    <MediaCardRightCorner>
                        {isCurrent ?
                            <MediaCardEditAction
                                label={`Edit ${userMedia.mediaName}`}
                                onClick={() => setDialogOpen(true)}
                            />
                            :
                            <QuickAddMedia
                                rounded={true}
                                onAdded={onEdited}
                                mediaType={mediaType}
                                allStatuses={allStatuses}
                                mediaId={userMedia.mediaId}
                                isMediaTypeActive={isMediaTypeActive}
                            />
                        }
                    </MediaCardRightCorner>
                }

                <MediaCardBadge>
                    {showMediaType &&
                        <MediaTypeIcon mediaType={mediaType}/>
                    }
                    {userMedia.status}
                </MediaCardBadge>

                <MediaCardFooter>
                    <MediaCardTitle title={userMedia.mediaName} className="flex items-center gap-1.5 tracking-tight">
                        <span className="truncate">
                            {userMedia.mediaName}
                        </span>
                        {isConnected && !isCurrent && isCommon &&
                            <Check aria-label="In your list" className="ml-auto size-4 shrink-0 text-brand"/>
                        }
                    </MediaCardTitle>
                    {hasMetadata &&
                        <MediaCardMeta className="min-h-4">
                            <div className="pointer-events-auto shrink-0 font-semibold tabular-nums text-foreground [&>div]:text-xs
                            [&>button]:text-xs [&_svg]:size-3! @min-[128px]/media-card:[&_svg]:size-3! @min-[200px]/media-card:[&_svg]:size-3!">
                                {ratingDisplay ?? (rating &&
                                    <DisplayRating rating={rating}/>
                                )}
                            </div>
                            <MediaCardSignals className="gap-2 @min-[128px]/media-card:gap-2 @min-[200px]/media-card:gap-2 [&_svg]:size-3!
                            @min-[128px]/media-card:[&_svg]:size-3! @min-[200px]/media-card:[&_svg]:size-3!">
                                {annotation &&
                                    <span role="group" aria-label="Collection note">
                                        <DisplayComment content={annotation}/>
                                    </span>
                                }
                                {userMedia.comment &&
                                    <DisplayComment
                                        content={userMedia.comment}
                                    />
                                }
                                {userMedia.favorite &&
                                    <DisplayFavorite
                                        isFavorite={userMedia.favorite}
                                    />
                                }
                                {redoDisplay &&
                                    <div className="flex items-center text-xs text-muted-foreground [&>button]:text-xs [&>div]:text-xs">
                                        {redoDisplay}
                                    </div>
                                }
                            </MediaCardSignals>
                        </MediaCardMeta>
                    }
                </MediaCardFooter>
            </MediaCard>

            <UserMediaEditDialog
                onEdited={onEdited}
                mediaType={mediaType}
                dialogOpen={dialogOpen}
                mediaId={userMedia.mediaId}
                mediaName={userMedia.mediaName}
                onOpenChange={() => setDialogOpen(false)}
            />
        </>
    );
};
