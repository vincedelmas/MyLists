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
import {MediaCornerCommon} from "@/lib/client/components/media/base/MediaCornerCommon";
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
    const { isCurrent, queryOption, isConnected, isMediaTypeActive, mediaType, allStatuses, rating, userMedia, redoDisplay, mediaDetailsDisplay } = props;

    const isCommon = isMediaTypeActive && userMedia.common;
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <>
            <MediaCard item={userMedia} mediaType={mediaType}>
                <div className="absolute right-2 top-2 z-10">
                    {isCurrent &&
                        <Button type="button" size="iconBare" variant="invisible" onClick={() => setDialogOpen(true)}>
                            <Settings2 className="size-4 opacity-70 hover:opacity-90 transition-opacity"/>
                        </Button>
                    }
                    {!isCurrent && !isCommon && isConnected &&
                        <div className="absolute right-0 -top-0.5 z-10">
                            <QuickAddMedia
                                mediaType={mediaType}
                                queryOption={queryOption}
                                allStatuses={allStatuses}
                                mediaId={userMedia.mediaId}
                                isMediaTypeActive={isMediaTypeActive}
                            />
                        </div>
                    }
                </div>
                <div className="absolute left-2 top-2 z-10 rounded-md bg-neutral-950 px-2 text-primary/95">
                    {mediaDetailsDisplay}
                </div>
                {isConnected &&
                    <MediaCornerCommon
                        isCommon={isCommon}
                    />
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
                        <Badge variant="outline" className="shrink-0 backdrop-blur-md">
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
                userMedia={userMedia}
                dialogOpen={dialogOpen}
                queryOption={queryOption}
                onOpenChange={() => setDialogOpen(false)}
            />
        </>
    );
};
