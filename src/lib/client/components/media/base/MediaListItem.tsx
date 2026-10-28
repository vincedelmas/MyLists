import {formatRating} from "@/lib/client/ratings";
import {MediaType, Status} from "@/lib/utils/enums";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {mediaConfig} from "@/lib/client/components/media/media-config";


interface MediaListItemProps<T extends MediaType> {
    mediaType: T;
    rank?: number;
    isCurrent: boolean;
    isConnected: boolean;
    showMediaType?: boolean;
    annotation?: string | null;
    isMediaTypeActive: boolean;
    onEdited?: () => Promise<void>;
    allStatuses: readonly Status[];
    userMedia: ExtractListByType<T>;
}


export const MediaListItem = <T extends MediaType>(props: MediaListItemProps<T>) => {
    const {
        mediaType, isCurrent, isConnected, isMediaTypeActive, allStatuses,
        userMedia, onEdited, showMediaType, rank, annotation,
    } = props;

    const MediaItemComponent = mediaConfig[mediaType].mediaListCard;
    const rating = formatRating(userMedia.ratingSystem, userMedia.rating);

    return (
        <MediaItemComponent
            rank={rank}
            rating={rating}
            onEdited={onEdited}
            isCurrent={isCurrent}
            mediaType={mediaType}
            userMedia={userMedia}
            annotation={annotation}
            isConnected={isConnected}
            allStatuses={allStatuses}
            showMediaType={showMediaType}
            isMediaTypeActive={isMediaTypeActive}
        />
    );
};
