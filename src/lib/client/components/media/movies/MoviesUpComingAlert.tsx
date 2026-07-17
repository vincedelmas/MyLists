import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


export const MoviesUpComingAlert = ({ media }: KindDetailsProps<typeof MediaType.MOVIES>) => {
    return (
        <UpComingAlert
            title="Movie Premiere"
            dateString={media.releaseDate}
        />
    );
};
