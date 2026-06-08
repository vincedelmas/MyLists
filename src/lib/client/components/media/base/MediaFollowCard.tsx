import {MediaType} from "@/lib/utils/enums";
import {formatRating} from "@/lib/utils/ratings-formatting";
import {ExtractFollowByType} from "@/lib/types/query.options.types";
import {mediaConfig} from "@/lib/client/components/media/media-config";


interface MediaFollowCard<T extends MediaType> {
    mediaType: T;
    showComment?: boolean;
    followData: ExtractFollowByType<T>;
}


export const MediaFollowCard = <T extends MediaType>({ followData, mediaType, showComment }: MediaFollowCard<T>) => {
    const FollowCardComponent = mediaConfig[mediaType].mediaFollowCard;
    const rating = formatRating(followData.ratingSystem, followData.userMedia.rating);

    return (
        <FollowCardComponent
            rating={rating}
            followData={followData}
            showComment={showComment}
        />
    );
};
