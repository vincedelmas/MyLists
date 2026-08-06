import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Calendar, Clock} from "lucide-react";
import {extractYear} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {MediaUnderItem, MediaUnderRating} from "@/lib/client/components/media/base/MediaDetailsComps";


type MoviesDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const MoviesUnderTitle = ({ media }: MoviesDetailsProps<typeof MediaType.MOVIES>) => {
    return (
        <>
            <MediaUnderRating
                voteCount={media.voteCount}
                voteAverage={media.voteAverage}
            />
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={Clock}>
                {formatMinutes(media.duration)}
            </MediaUnderItem>
        </>
    );
};
