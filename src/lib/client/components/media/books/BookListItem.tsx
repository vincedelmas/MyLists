import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {FamilyListItemProps} from "@/lib/client/components/media/family-component.types";
import {DisplayPages} from "@/lib/client/components/media/base/DisplayPages";
import {DisplayRedoValue} from "@/lib/client/components/media/base/DisplayRedoValue";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";


export const BookListItem = (props: FamilyListItemProps<typeof MediaType.BOOKS>) => {
    return (
        <BaseMediaListItem
            {...props}
            redoDisplay={props.userMedia.rereadCount > 0 &&
                <DisplayRedoValue
                    redoValue={props.userMedia.rereadCount}
                />
            }
            mediaDetailsDisplay={
                <DisplayPages
                    total={props.userMedia.pages}
                    status={props.userMedia.status}
                    currentPage={props.userMedia.currentPage}
                />
            }
        />
    );
};
