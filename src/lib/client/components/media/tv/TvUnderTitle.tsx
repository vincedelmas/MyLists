import React from "react";
import {Calendar, Clock, Tv} from "lucide-react";
import {extractYear} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";
import {MediaUnderItem, MediaUnderRating} from "@/lib/client/components/media/base/MediaDetailsComps";


export const TvUnderTitle = ({ media }: FamilyDetailsProps<TvMediaType>) => {
    return (
        <>
            <MediaUnderRating
                voteCount={media.voteCount}
                voteAverage={media.voteAverage}
            />
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={Tv}>
                {media.totalSeasons ?? DEFAULT_DASH_FALLBACK} Seasons
            </MediaUnderItem>
            <MediaUnderItem icon={Clock}>
                {formatMinutes(media.duration, { compact: true })}
            </MediaUnderItem>
        </>
    );
};
