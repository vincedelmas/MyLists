import {MediaType} from "@/lib/utils/enums";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {DisplayTvRedo} from "@/lib/client/components/media/tv/DisplayTvRedo";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";


type TvFollowCardProps<T extends MediaType> = Parameters<MediaConfig[T]["mediaFollowCard"]>[number];


export const TvFollowCard = ({ followData, rating, showComment }: TvFollowCardProps<TvMediaType>) => {
    return (
        <BaseMediaFollowCard
            rating={rating}
            followData={followData}
            showComment={showComment}
            redoDisplay={
                <DisplayTvRedo
                    redoValues={followData.userMedia.redo2}
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
