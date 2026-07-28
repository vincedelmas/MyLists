import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {statusUtils} from "@/lib/utils/media-mapping";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {mediaListOptions} from "@/lib/client/react-query/query-options";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {MediaListItem} from "@/lib/client/components/media/base/MediaListItem";


interface MediaGridProps {
    isCurrent: boolean;
    mediaType: MediaType;
    mediaItems: UserMediaItem[];
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const MediaGrid = ({ isCurrent, mediaItems, queryOption, mediaType }: MediaGridProps) => {
    const { currentUser } = useAuth();
    const allStatuses = statusUtils.byMediaType(mediaType);
    const isMediaTypeActive = resolveMediaTypeActive(currentUser?.settings, mediaType);

    return (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:gap-4 lg:grid-cols-5 sm:gap-5">
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
        </div>
    );
};
