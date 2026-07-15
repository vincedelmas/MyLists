import {formatRating} from "@/lib/utils/ratings-formatting";
import {MediaType, Status} from "@/lib/utils/enums";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {mediaConfig} from "@/lib/client/components/media/media-config";
import {mediaListOptions} from "@/lib/client/react-query/query-options";


interface MediaListItemProps<T extends MediaType> {
    mediaType: T;
    isCurrent: boolean;
    isConnected: boolean;
    isMediaTypeActive: boolean;
    allStatuses: Status[];
    userMedia: ExtractListByType<T>;
    queryOption: ReturnType<typeof mediaListOptions>;
}


export const MediaListItem = <T extends MediaType>(props: MediaListItemProps<T>) => {
    const { mediaType, queryOption, isCurrent, isConnected, isMediaTypeActive, allStatuses, userMedia } = props;

    const MediaItemComponent = mediaConfig[mediaType].mediaListCard;
    const rating = formatRating(userMedia.ratingSystem, userMedia.rating);

    return (
        <MediaItemComponent
            rating={rating}
            isCurrent={isCurrent}
            mediaType={mediaType}
            userMedia={userMedia}
            queryOption={queryOption}
            isConnected={isConnected}
            isMediaTypeActive={isMediaTypeActive}
            allStatuses={allStatuses}
        />
    );
};
