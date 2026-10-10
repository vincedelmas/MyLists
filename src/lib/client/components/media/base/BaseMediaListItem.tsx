import React, {useState} from "react";
import {MediaType, Status} from "@/lib/utils/enums";
import {canShowProgress} from "@/lib/utils/media/status";
import {Badge} from "@/lib/client/components/ui/badge";
import type {UserMediaItem} from "@/lib/types/query.options.types";
import type {mediaListOptions} from "@/lib/client/react-query/query-options";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {DisplayFavorite} from "@/lib/client/components/media/base/DisplayFavorite";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {MediaCardEditAction} from "@/lib/client/components/media/base/MediaCardEditAction";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {
    MediaCard,
    MediaCardDetails,
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
    loadEditDetails?: boolean;
    isMediaTypeActive: boolean;
    annotation?: string | null;
    redoDisplay?: React.ReactNode;
    allStatuses: readonly Status[];
    onEdited?: () => Promise<void>;
    ratingDisplay?: React.ReactNode;
    mediaDetailsDisplay?: React.ReactNode;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const BaseMediaListItem = (props: BaseMediaListItemProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);

    const {
        rank,
        rating,
        onEdited,
        mediaType,
        userMedia,
        isCurrent,
        annotation,
        redoDisplay,
        queryOption,
        isConnected,
        allStatuses,
        showMediaType,
        ratingDisplay,
        loadEditDetails,
        isMediaTypeActive,
        mediaDetailsDisplay
    } = props;

    const isCommon = isMediaTypeActive && userMedia.common;
    const showMediaDetails = mediaDetailsDisplay && canShowProgress(userMedia.status);

    return (
        <>
            <MediaCard item={userMedia} mediaType={mediaType}>
                {(rank !== undefined || showMediaDetails) &&
                    <MediaCardLeftCorner>
                        {rank !== undefined && <span>#{rank}</span>}
                        {showMediaDetails && mediaDetailsDisplay}
                    </MediaCardLeftCorner>
                }

                {isConnected &&
                    <MediaCardRightCorner>
                        {isCurrent ?
                            <MediaCardEditAction
                                label={`Edit ${userMedia.mediaName}`}
                                onClick={() => setDialogOpen(true)}
                            />
                            :
                            isConnected && (isCommon ?
                                    <DisplayInUserListCheck/>
                                    :
                                    <QuickAddMedia
                                        mediaType={mediaType}
                                        queryOption={queryOption}
                                        allStatuses={allStatuses}
                                        mediaId={userMedia.mediaId}
                                        isMediaTypeActive={isMediaTypeActive}
                                    />
                            )
                        }
                    </MediaCardRightCorner>
                }

                <MediaCardFooter>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                        <MediaCardTitle className="grow" title={userMedia.mediaName}>
                            {userMedia.mediaName}
                        </MediaCardTitle>
                        <div className="shrink-0">
                            {ratingDisplay ?? (rating &&
                                <DisplayRating
                                    rating={rating}
                                />
                            )}
                        </div>
                    </div>
                    <MediaCardMeta>
                        <MediaCardDetails>
                            <Badge variant="overlay" className="shrink-0">
                                {showMediaType && <MediaTypeIcon mediaType={mediaType}/>}
                                {userMedia.status}
                            </Badge>
                        </MediaCardDetails>
                        <MediaCardSignals>
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
                            {redoDisplay}
                        </MediaCardSignals>
                    </MediaCardMeta>
                </MediaCardFooter>
            </MediaCard>

            <UserMediaEditDialog
                onEdited={onEdited}
                mediaType={mediaType}
                userMedia={userMedia}
                dialogOpen={dialogOpen}
                queryOption={queryOption}
                loadDetails={loadEditDetails}
                onOpenChange={() => setDialogOpen(false)}
            />
        </>
    );
};
