import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type GamesDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const GamesUpComingAlert = ({ media }: GamesDetailsProps<typeof MediaType.GAMES>) => {
    return (
        <UpComingAlert
            title="Game Release"
            dateString={media.releaseDate}
        />
    );
};
