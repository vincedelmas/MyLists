import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {resolveMediaTypeActive} from "@/lib/utils/media/list-activation";
import {MediaListItem} from "@/lib/client/components/media/base/MediaListItem";
import {MediaListGrid} from "@/lib/client/components/media/base/MediaListGrid";


interface MediaGridProps {
    isCurrent: boolean;
    mediaType: MediaType;
    mediaItems: UserMediaItem[];
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const MediaGrid = ({ isCurrent, mediaItems, queryOption, mediaType }: MediaGridProps) => {
    const { currentUser } = useAuth();
    const allStatuses = getMediaDefinition(mediaType).statuses;
    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);

    return (
        <MediaListGrid>
            {mediaItems.map((userMedia) =>
                <MediaListItem
                    userMedia={userMedia}
                    isCurrent={isCurrent}
                    mediaType={mediaType}
                    key={userMedia.mediaId}
                    queryOption={queryOption}
                    allStatuses={allStatuses}
                    isConnected={!!currentUser}
                    isMediaTypeActive={isMediaTypeActive}
                />
            )}
        </MediaListGrid>
    );
};
