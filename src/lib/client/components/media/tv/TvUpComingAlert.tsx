import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type TvDetailsProps<T extends MediaType> = Parameters<NonNullable<MediaConfig[T]["upComingAlert"]>>[number];


export const TvUpComingAlert = ({ media }: TvDetailsProps<TvMediaType>) => {
    return (
        <UpComingAlert title="Next Episode" dateString={media.nextEpisodeToAir}>
            S{zeroPad(media.seasonToAir)}.E{zeroPad(media.episodeToAir)}
        </UpComingAlert>
    );
};
