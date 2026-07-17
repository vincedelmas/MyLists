import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


export const GamesUpComingAlert = ({ media }: FamilyDetailsProps<typeof MediaType.GAMES>) => {
    return (
        <UpComingAlert
            title="Game Release"
            dateString={media.releaseDate}
        />
    );
};
