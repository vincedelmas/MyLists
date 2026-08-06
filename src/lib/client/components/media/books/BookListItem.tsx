import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {DisplayPages} from "@/lib/client/components/media/base/DisplayPages";
import {MediaListCardProps} from "@/lib/client/components/media/media-config.types";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";


type BookListItemProps<T extends MediaType> = MediaListCardProps<T>;


export const BookListItem = (props: BookListItemProps<typeof MediaType.BOOKS>) => {
    return (
        <BaseMediaListItem
            {...props}
            redoDisplay={!!props.userMedia.redo &&
                <DisplayRedoValue
                    redoValue={props.userMedia.redo}
                />
            }
            mediaDetailsDisplay={
                <DisplayPages
                    total={props.userMedia.pages}
                    status={props.userMedia.status}
                    currentPage={props.userMedia.actualPage}
                />
            }
        />
    );
};
