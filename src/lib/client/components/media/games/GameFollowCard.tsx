import {MediaType} from "@/lib/utils/enums";
import {FamilyFollowCardProps} from "@/lib/client/components/media/family-component.types";
import {DisplayPlaytime} from "@/lib/client/components/media/games/DisplayPlaytime";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


export const GameFollowCard = ({ followData, rating, showComment }: FamilyFollowCardProps<typeof MediaType.GAMES>) => {
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
