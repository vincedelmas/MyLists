import React, {useState} from "react";
import {MediaType, Status} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {DisplayFavorite} from "@/lib/client/components/media/base/DisplayFavorite";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";
import {MediaCardEditAction} from "@/lib/client/components/media/base/MediaCardEditAction";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
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
    isCurrent: boolean;
    isConnected: boolean;
    mediaType: MediaType;
    allStatuses: Status[];
    rating: React.ReactNode;
    userMedia: UserMediaItem;
    isMediaTypeActive: boolean;
    redoDisplay?: React.ReactNode;
    mediaDetailsDisplay?: React.ReactNode;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const BaseMediaListItem = (props: BaseMediaListItemProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { isCurrent, queryOption, isConnected, isMediaTypeActive, mediaType, allStatuses, rating, userMedia, redoDisplay, mediaDetailsDisplay } = props;

    const isCommon = isMediaTypeActive && userMedia.common;
    const mediaCardSlot = (isCurrent || (!isCurrent && isConnected && !isCommon)) ? "personal" : "context";

    return (
        <>
            <MediaCard item={userMedia} mediaType={mediaType}>
                {mediaDetailsDisplay &&
                    <MediaCardLeftCorner>
                        {mediaDetailsDisplay}
                    </MediaCardLeftCorner>
                }
                {isConnected &&
                    <MediaCardRightCorner slot={mediaCardSlot}>
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
                            {rating &&
                                <DisplayRating rating={rating}/>
                            }
                        </div>
                    </div>
                    <MediaCardMeta>
                        <MediaCardDetails>
                            <Badge variant="overlay" className="shrink-0">
                                {userMedia.status}
                            </Badge>
                        </MediaCardDetails>
                        <MediaCardSignals>
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
                mediaType={mediaType}
                userMedia={userMedia}
                dialogOpen={dialogOpen}
                queryOption={queryOption}
                onOpenChange={() => setDialogOpen(false)}
            />
        </>
    );
};
