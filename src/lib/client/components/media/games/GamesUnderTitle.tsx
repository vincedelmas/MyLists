import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Calendar, Clock} from "lucide-react";
import {extractYear} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {MediaUnderItem, MediaUnderRating} from "@/lib/client/components/media/base/MediaDetailsComps";


type GamesDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["underTitle"]>[number];
const gamesProgressTiming = gamesDefinition.progress.timing;


export const GamesUnderTitle = ({ media }: GamesDetailsProps<typeof MediaType.GAMES>) => {
    return (
        <>
            <MediaUnderRating
                divisor={10}
                voteCount={media.voteCount}
                voteAverage={media.voteAverage}
            />
            <MediaUnderItem icon={Calendar}>
                {extractYear(media.releaseDate)}
            </MediaUnderItem>
            <MediaUnderItem icon={Clock}>
                {formatMinutes(media.hltbMainTime ? (media.hltbMainTime * gamesProgressTiming.minutesPerInputUnit) : null, { onlyHours: true })}
            </MediaUnderItem>
        </>
    );
};
