import {MediaType} from "@/lib/utils/enums";
import {statusUtils} from "@/lib/utils/media-mapping";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {UserMediaItem} from "@/lib/types/query.options.types";
import {MediaListItem} from "@/lib/client/components/media/base/MediaListItem";
import {mediaListOptions} from "@/lib/client/react-query/query-options";


interface MediaGridProps {
    isCurrent: boolean;
    mediaType: MediaType;
    mediaItems: UserMediaItem[];
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const MediaGrid = ({ isCurrent, mediaItems, queryOption, mediaType }: MediaGridProps) => {
    const { currentUser } = useAuth();
    const allStatuses = statusUtils.byMediaType(mediaType);
    const isMediaTypeActive = currentUser?.settings.some((setting) => setting.mediaType === mediaType && setting.active) ?? false;

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
