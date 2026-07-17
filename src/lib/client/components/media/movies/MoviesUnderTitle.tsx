import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Calendar, Clock} from "lucide-react";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {extractYear} from "@/lib/utils/date-formatting";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";
import {MediaUnderItem, MediaUnderRating} from "@/lib/client/components/media/base/MediaDetailsComps";


export const MoviesUnderTitle = ({ media }: KindDetailsProps<typeof MediaType.MOVIES>) => {
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
