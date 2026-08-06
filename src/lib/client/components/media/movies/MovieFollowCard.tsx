import {MediaType} from "@/lib/utils/enums";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {MediaFollowCardProps} from "@/lib/client/components/media/media-config.types";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


type MovieFollowCardProps<T extends MediaType> = MediaFollowCardProps<T>;


export const MovieFollowCard = ({ followData, rating, showComment }: MovieFollowCardProps<typeof MediaType.MOVIES>) => {
    return (
        <BaseMediaFollowCard
            rating={rating}
            followData={followData}
            showComment={showComment}
            redoDisplay={
                <DisplayRedoValue
                    redoValue={followData.userMedia.redo}
                />
            }
        />
    );
};
