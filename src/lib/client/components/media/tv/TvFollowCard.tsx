import {TvMediaType} from "@/lib/types/media-kind.types";
import {KindFollowCardProps} from "@/lib/client/components/media/family-component.types";
import {DisplayTvRedo} from "@/lib/client/components/media/tv/DisplayTvRedo";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";
import {DisplayEpsAndSeasons} from "@/lib/client/components/media/tv/DisplayEpsAndSeasons";


export const TvFollowCard = ({ followData, rating, showComment }: KindFollowCardProps<TvMediaType>) => {
    return (
        <BaseMediaFollowCard
            rating={rating}
            followData={followData}
            showComment={showComment}
            redoDisplay={
                <DisplayTvRedo
                    rewatches={followData.userMedia.rewatches}
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
