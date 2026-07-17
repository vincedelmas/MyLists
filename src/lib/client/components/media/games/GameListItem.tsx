import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {KindListItemProps} from "@/lib/client/components/media/family-component.types";
import {DisplayPlaytime} from "@/lib/client/components/media/games/DisplayPlaytime";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";


export const GameListItem = (props: KindListItemProps<typeof MediaType.GAMES>) => {
    return (
        <BaseMediaListItem
            {...props}
            mediaDetailsDisplay={
                <DisplayPlaytime
                    status={props.userMedia.status}
                    playtime={props.userMedia.playtime}
                />
            }
        />
    );
};
