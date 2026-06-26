import {MediaType} from "@/lib/utils/enums";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {DisplayPlaytime} from "@/lib/client/components/media/games/DisplayPlaytime";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


type GameFollowCardProps<T extends MediaType> = Parameters<MediaConfig[T]["mediaFollowCard"]>[number];


export const GameFollowCard = ({ followData, rating, showComment }: GameFollowCardProps<typeof MediaType.GAMES>) => {
    return (
        <BaseMediaFollowCard
            rating={rating}
            followData={followData}
            showComment={showComment}
            mediaDetailsDisplay={
                <DisplayPlaytime
                    status={followData.userMedia.status}
                    playtime={followData.userMedia.playtime}
                />
            }
        />
    );
};
