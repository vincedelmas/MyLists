import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {TvMediaType} from "@/lib/utils/enums";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type TvDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const TvUpComingAlert = ({ media }: TvDetailsProps<TvMediaType>) => {
    return (
        <UpComingAlert title="Next Episode" dateString={media.nextEpisodeToAir}>
            S{zeroPad(media.seasonToAir)}.E{zeroPad(media.episodeToAir)}
        </UpComingAlert>
    );
};
