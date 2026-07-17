import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {KindListItemProps} from "@/lib/client/components/media/family-component.types";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";


export const MovieListItem = (props: KindListItemProps<typeof MediaType.MOVIES>) => {
    return (
        <BaseMediaListItem
            {...props}
            redoDisplay={props.userMedia.rewatchCount > 0 &&
                <DisplayRedoValue
                    redoValue={props.userMedia.rewatchCount}
                />
            }
        />
    );
};
