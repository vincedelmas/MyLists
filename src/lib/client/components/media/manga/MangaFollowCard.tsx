import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {DisplayChapters} from "@/lib/client/components/media/base/DisplayChapters";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {MediaFollowCardProps} from "@/lib/client/components/media/media-config.types";
import {BaseMediaFollowCard} from "@/lib/client/components/media/base/BaseMediaFollowCard";


type MangaFollowCardProps<T extends MediaType> = MediaFollowCardProps<T>;


export const MangaFollowCard = ({ followData, rating, showComment }: MangaFollowCardProps<typeof MediaType.MANGA>) => {
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
                <DisplayChapters
                    status={followData.userMedia.status}
                    currentChapter={followData.userMedia.currentChapter}
                />
            }
        />
    );
};
