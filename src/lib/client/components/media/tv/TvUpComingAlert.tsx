import React from "react";
import {zeroPad} from "@/lib/utils/number-formatting";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";
import {UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


export const TvUpComingAlert = ({ media }: KindDetailsProps<TvMediaType>) => {
    return (
        <UpComingAlert title="Next Episode" dateString={media.nextEpisodeToAir}>
            S{zeroPad(media.seasonToAir)}.E{zeroPad(media.episodeToAir)}
        </UpComingAlert>
    );
};
