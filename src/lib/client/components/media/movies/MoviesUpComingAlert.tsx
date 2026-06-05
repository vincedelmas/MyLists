import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type MoviesDetailsProps<T extends MediaType> = Parameters<NonNullable<MediaConfig[T]["upComingAlert"]>>[number];


export const MoviesUpComingAlert = ({ media }: MoviesDetailsProps<typeof MediaType.MOVIES>) => {
    return (
        <UpComingAlert
            title="Movie Premiere"
            dateString={media.releaseDate}
        />
    );
};
