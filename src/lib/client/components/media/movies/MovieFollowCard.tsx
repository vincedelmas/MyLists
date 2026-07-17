import {MediaType} from "@/lib/utils/enums";
import {FamilyFollowCardProps} from "@/lib/client/components/media/family-component.types";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


export const MovieFollowCard = ({ followData, rating, showComment }: FamilyFollowCardProps<typeof MediaType.MOVIES>) => {
    return (
        <BaseMediaFollowCard
            rating={rating}
            followData={followData}
            showComment={showComment}
            redoDisplay={
                <DisplayRedoValue
                    redoValue={followData.userMedia.rewatchCount}
                />
            }
        />
    );
};
