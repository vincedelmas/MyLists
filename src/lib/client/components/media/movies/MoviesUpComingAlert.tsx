import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


export const MoviesUpComingAlert = ({ media }: FamilyDetailsProps<typeof MediaType.MOVIES>) => {
    return (
        <UpComingAlert
            title="Movie Premiere"
            dateString={media.releaseDate}
        />
    );
};
