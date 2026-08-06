import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {DisplayPages} from "@/lib/client/components/media/base/DisplayPages";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {MediaFollowCardProps} from "@/lib/client/components/media/media-config.types";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


type BookFollowCardProps<T extends MediaType> = MediaFollowCardProps<T>;


export const BookFollowCard = ({ followData, rating, showComment }: BookFollowCardProps<typeof MediaType.BOOKS>) => {
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
            mediaDetailsDisplay={
                <DisplayPages
                    status={followData.userMedia.status}
                    currentPage={followData.userMedia.actualPage}
                />
            }
        />
    );
};
