import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {DisplayPlaytime} from "@/lib/client/components/media/games/DisplayPlaytime";
import {MediaListCardProps} from "@/lib/client/components/media/media-config.types";
import {BaseMediaListItem} from "@/lib/client/components/media/base/BaseMediaListItem";


type GameListItemProps<T extends MediaType> = MediaListCardProps<T>;


export const GameListItem = (props: GameListItemProps<typeof MediaType.GAMES>) => {
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