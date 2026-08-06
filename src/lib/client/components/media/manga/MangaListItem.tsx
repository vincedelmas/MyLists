import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {DisplayChapters} from "@/lib/client/components/media/base/DisplayChapters";
import {MediaListCardProps} from "@/lib/client/components/media/media-config.types";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";


type MangaListItemProps<T extends MediaType> = MediaListCardProps<T>;


export const MangaListItem = (props: MangaListItemProps<typeof MediaType.MANGA>) => {
    return (
        <BaseMediaListItem
            {...props}
            redoDisplay={!!props.userMedia.redo &&
                <DisplayRedoValue
                    redoValue={props.userMedia.redo}
                />
            }
            mediaDetailsDisplay={
                <DisplayChapters
                    status={props.userMedia.status}
                    total={props.userMedia.chapters}
                    currentChapter={props.userMedia.currentChapter}
                />
            }
        />
    );
};
