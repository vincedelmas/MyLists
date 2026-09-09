import {MediaType, TvMediaType} from "@/lib/utils/enums";
import {TvSeasonPopover} from "@/lib/client/components/media/tv/TvSeasonPopover";
import {MediaFollowCardProps} from "@/lib/client/components/media/media-config.types";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";


type TvFollowCardProps<T extends MediaType> = MediaFollowCardProps<T>;


export const TvFollowCard = ({ followData, rating, showComment, mediaType }: TvFollowCardProps<TvMediaType>) => {
    return (
        <BaseMediaFollowCard
            rating={rating}
            followData={followData}
            showComment={showComment}
            ratingDisplay={
                <TvSeasonPopover
                    kind="rating"
                    mediaType={mediaType}
                    userId={followData.id}
                    value={followData.userMedia.rating}
                    mediaId={followData.userMedia.mediaId}
                    ratingSystem={followData.ratingSystem}
                />
            }
            redoDisplay={
                <TvSeasonPopover
                    kind="redo"
                    mediaType={mediaType}
                    userId={followData.id}
                    value={followData.userMedia.redo}
                    mediaId={followData.userMedia.mediaId}
                    ratingSystem={followData.ratingSystem}
                />
            }
            mediaDetailsDisplay={
                <DisplayEpsAndSeasons
                    status={followData.userMedia.status}
                    currentSeason={followData.userMedia.currentSeason}
                    currentEpisode={followData.userMedia.currentEpisode}
                />
            }
        />
    );
};
