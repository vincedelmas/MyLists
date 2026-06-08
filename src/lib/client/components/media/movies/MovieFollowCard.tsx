import {MediaType} from "@/lib/utils/enums";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


type MovieFollowCardProps<T extends MediaType> = Parameters<MediaConfig[T]["mediaFollowCard"]>[number];


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
