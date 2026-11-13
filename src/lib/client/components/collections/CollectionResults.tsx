import type {MediaType} from "@/lib/utils/enums";
import {toItemKey} from "@/lib/utils/media/item-key";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";
import {QuickAddMedia} from "@/lib/client/components/media/base/QuickAddMedia";
import {DisplayComment} from "@/lib/client/components/media/base/DisplayComment";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaListIndicator} from "@/lib/client/components/media/base/MediaListIndicator";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {CollectionResultsTable} from "@/lib/client/components/collections/CollectionResultsTable";
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


interface CollectionResultItem {
    rank?: number;
    mediaId: number;
    mediaName: string;
    imageCover: string;
    mediaType: MediaType;
    inUserList?: boolean;
    annotation?: string | null;
    releaseDate?: string | null;
}


export interface CollectionResultsProps {
    isConnected: boolean;
    display: "grid" | "table";
    items: CollectionResultItem[];
    onEdited: () => Promise<void>;
    activeMediaTypes?: readonly MediaType[];
}


export const CollectionResults = (props: CollectionResultsProps) => {
    const { items, display, isConnected, onEdited, activeMediaTypes = ALL_MEDIA_TYPES } = props;

    if (display === "table") {
        return (
            <CollectionResultsTable
                {...props}
            />
        );
    }

    return (
        <MediaListGrid>
            {items.map(item =>
                <MediaCard key={toItemKey(item)} item={item} mediaType={item.mediaType}>
                    <MediaCardLeftCorner>
                        <MediaTypeIcon mediaType={item.mediaType}/>
                        {item.rank !== undefined
                            ? `#${item.rank}`
                            : <MediaTypeText mediaType={item.mediaType}/>
                        }
                    </MediaCardLeftCorner>

                    {isConnected && !item.inUserList &&
                        <MediaCardRightCorner>
                            <QuickAddMedia
                                rounded={true}
                                onAdded={onEdited}
                                mediaId={item.mediaId}
                                mediaType={item.mediaType}
                                allStatuses={getMediaDefinition(item.mediaType).statuses}
                                isMediaTypeActive={activeMediaTypes.includes(item.mediaType)}
                            />
                        </MediaCardRightCorner>
                    }

                    <MediaCardFooter>
                        <MediaCardTitle title={item.mediaName} className="flex items-center gap-1.5 tracking-tight">
                            <span className="truncate">
                                {item.mediaName}
                            </span>
                            {isConnected && item.inUserList &&
                                <MediaListIndicator mediaName={item.mediaName} presentation="icon" className="ml-auto"/>
                            }
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
