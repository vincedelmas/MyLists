import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {KindListItemProps} from "@/lib/client/components/media/family-component.types";
import {DisplayChapters} from "@/lib/client/components/media/base/DisplayChapters";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";


export const MangaListItem = (props: KindListItemProps<typeof MediaType.MANGA>) => {
    return (
        <BaseMediaListItem
            {...props}
            redoDisplay={props.userMedia.rereadCount > 0 &&
                <DisplayRedoValue
                    redoValue={props.userMedia.rereadCount}
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
