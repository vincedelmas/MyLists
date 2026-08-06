import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type MoviesDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const MoviesUpComingAlert = ({ media }: MoviesDetailsProps<typeof MediaType.MOVIES>) => {
    return (
        <UpComingAlert
            title="Movie Premiere"
            dateString={media.releaseDate}
        />
    );
};
