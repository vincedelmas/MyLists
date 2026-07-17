import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {FamilyFollowCardProps} from "@/lib/client/components/media/family-component.types";
import {DisplayChapters} from "@/lib/client/components/media/base/DisplayChapters";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


export const MangaFollowCard = ({ followData, rating, showComment }: FamilyFollowCardProps<typeof MediaType.MANGA>) => {
    return (
        <BaseMediaFollowCard
            rating={rating}
            followData={followData}
            showComment={showComment}
            redoDisplay={
                <DisplayRedoValue
                    redoValue={followData.userMedia.rereadCount}
                />
            }
            mediaDetailsDisplay={
                <DisplayChapters
                    status={followData.userMedia.status}
                    currentChapter={followData.userMedia.currentChapter}
                />
            }
        />
    );
};
