import type {MediaType} from "@/lib/utils/enums";
import {toItemKey} from "@/lib/utils/media/item-key";
import type {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";
import {MediaListItem} from "@/lib/client/components/media/base/MediaListItem";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaListResultsTable} from "@/lib/client/components/media/base/MediaListResultsTable";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaTypeIcon, MediaTypeText} from "@/lib/client/components/media/base/MediaTypeIndicator";
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


interface MediaListResultItem {
    rank?: number;
    mediaId: number;
    mediaName: string;
    imageCover: string;
    mediaType: MediaType;
    annotation?: string | null;
    releaseDate?: string | null;
    userMedia: UserMediaItem | null;
}


export interface MediaListResultsProps {
    username: string;
    isCurrent: boolean;
    isConnected: boolean;
    display: "grid" | "table";
    items: MediaListResultItem[];
    onEdited: () => Promise<void>;
    activeMediaTypes?: readonly MediaType[];
}


export const MediaListResults = (props: MediaListResultsProps) => {
    const { items, display, username, isCurrent, isConnected, onEdited, activeMediaTypes = ALL_MEDIA_TYPES } = props;

    if (display === "table") {
        return (
            <MediaListResultsTable
                {...props}
            />
        );
    }

    return (
        <MediaListGrid>
            {items.map(item => item.userMedia ?
                <MediaListItem
                    rank={item.rank}
                    onEdited={onEdited}
                    showMediaType={true}
                    key={toItemKey(item)}
                    isCurrent={isCurrent}
                    loadEditDetails={true}
                    isConnected={isConnected}
                    mediaType={item.mediaType}
                    userMedia={item.userMedia}
                    annotation={item.annotation}
                    allStatuses={getMediaDefinition(item.mediaType).statuses}
                    isMediaTypeActive={activeMediaTypes.includes(item.mediaType)}
                    queryOption={mediaListOptions(item.mediaType, username, { page: 1, perPage: 25 })}
                />
                :
                <MediaCard key={toItemKey(item)} item={item} mediaType={item.mediaType}>
                    <MediaCardLeftCorner>
                        <MediaTypeIcon mediaType={item.mediaType}/>
                        {item.rank !== undefined
                            ? `#${item.rank}`
                            : <MediaTypeText mediaType={item.mediaType}/>
                        }
                    </MediaCardLeftCorner>

                    {isConnected &&
                        <MediaCardRightCorner>
                            <QuickAddMedia
                                mediaId={item.mediaId}
                                mediaType={item.mediaType}
                                allStatuses={getMediaDefinition(item.mediaType).statuses}
                                isMediaTypeActive={activeMediaTypes.includes(item.mediaType)}
                                queryOption={mediaListOptions(item.mediaType, username, { page: 1, perPage: 25 })}
                            />
                        </MediaCardRightCorner>
                    }

                    <MediaCardFooter>
                        <MediaCardTitle lines={2}>
                            {item.mediaName}
                        </MediaCardTitle>
                        <MediaCardMeta>
                            <MediaCardDetails>
                                <MediaReleaseDate
                                    date={item.releaseDate ?? null}
                                />
                            </MediaCardDetails>
                            {item.annotation &&
                                <MediaCardSignals>
                                    <span role="group" aria-label="Collection note">
                                        <DisplayComment
                                            content={item.annotation}
                                        />
                                    </span>
                                </MediaCardSignals>
                            }
                        </MediaCardMeta>
                    </MediaCardFooter>
                </MediaCard>
            )}
        </MediaListGrid>
    );
};
