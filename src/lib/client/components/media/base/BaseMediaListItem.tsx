import React, {useState} from "react";
import {Settings2} from "lucide-react";
import {MediaType, Status} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {Button} from "@/lib/client/components/ui/button";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {MediaCard} from "@/lib/client/components/media/base/MediaCard";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayRating} from "@/lib/client/components/media/base/DisplayRating";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {DisplayFavorite} from "@/lib/client/components/media/base/DisplayFavorite";
import {DisplayInUserListCheck} from "@/lib/client/components/media/base/DisplayInUserListCheck";
import {UserMediaEditDialog} from "@/lib/client/components/media/base/UserMediaEditDialog";


interface BaseMediaListItemProps {
    isCurrent: boolean;
    isConnected: boolean;
    isMediaTypeActive: boolean;
    mediaType: MediaType;
    allStatuses: Status[];
    rating: React.ReactNode;
    userMedia: UserMediaItem;
    redoDisplay?: React.ReactNode;
    mediaDetailsDisplay?: React.ReactNode;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const BaseMediaListItem = (props: BaseMediaListItemProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { isCurrent, queryOption, isConnected, isMediaTypeActive, mediaType, allStatuses, rating, userMedia, redoDisplay, mediaDetailsDisplay } = props;
    const isCommon = isMediaTypeActive && userMedia.common;

    return (
        <>
            <MediaCard item={userMedia} mediaType={mediaType} showShade={isConnected}>
                {isCurrent &&
                    <div className="absolute right-1.5 top-1.5 z-10">
                        <Button type="button" size="bare" variant="ghost" onClick={() => setDialogOpen(true)}>
                            <Settings2 className="size-4 opacity-70 group-hover:opacity-90"/>
                        </Button>
                    </div>
                }

                {(isConnected && !isCurrent && !isCommon) &&
                    <QuickAddMedia
                        mediaType={mediaType}
                        queryOption={queryOption}
                        allStatuses={allStatuses}
                        mediaId={userMedia.mediaId}
                        isMediaTypeActive={isMediaTypeActive}
                    />
                }

                <Badge variant="overlay" className="absolute top-2 left-2 z-10">
                    {mediaDetailsDisplay}
                </Badge>

                {(isConnected && isCommon) &&
                    <DisplayInUserListCheck/>
                }

                <div className="absolute bottom-0 w-full space-y-2 rounded-b-sm p-3">
                    <div className="flex w-full items-center justify-between space-x-2 max-sm:text-sm">
                        <h3 className="grow truncate font-semibold" title={userMedia.mediaName}>
                            {userMedia.mediaName}
                        </h3>
                        <div className="shrink-0">
                            {rating &&
                                <DisplayRating rating={rating}/>
                            }
                        </div>
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-between">
                        <Badge variant="overlay" className="shrink-0">
                            {userMedia.status}
                        </Badge>
                        <div className="flex shrink-0 items-center gap-2">
                            {userMedia.favorite &&
                                <DisplayFavorite
                                    size={16}
                                    isFavorite={userMedia.favorite}
                                />
                            }
                            {userMedia.comment &&
                                <DisplayComment
                                    content={userMedia.comment}
                                />
                            }
                            {redoDisplay}
                        </div>
                    </div>
                </div>
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
