import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type GamesDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["infoGrid"]>[number];
const gamesProgressTiming = gamesDefinition.progress.timing;


export const GamesInfoGrid = ({ mediaType, media }: GamesDetailsProps<typeof MediaType.GAMES>) => {
    const publishers = media.companies ? media.companies.filter((c) => c.publisher) : [];
    const developers = media.companies ? media.companies.filter((c) => c.developer) : [];

    return (
        <>
            <MediaInfoGridItem label="Developed By">
                {developers.length > 0 ?
                    developers.slice(0, 3).map((dev) =>
                        <Link key={dev.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: dev.name }}>
                            <div>{dev.name}</div>
                        </Link>
                    )
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Published By">
                {publishers.length > 0 ?
                    publishers.slice(0, 3).map((pub) =>
                        <Link key={pub.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "publisher", name: pub.name }}>
                            <div>{pub.name}</div>
                        </Link>
                    )
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Release Date">
                {formatDate(media.releaseDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Perspective">
                {media.playerPerspective ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Engine">
                {media.gameEngine ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB Main">
                {formatMinutes(media.hltbMainTime ? media.hltbMainTime * gamesProgressTiming.minutesPerInputUnit : null, { onlyHours: true })}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB Main & Extra">
                {formatMinutes(media.hltbMainAndExtraTime ? media.hltbMainAndExtraTime * gamesProgressTiming.minutesPerInputUnit : null, { onlyHours: true })}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB 100%">
                {formatMinutes(media.hltbTotalCompleteTime ? media.hltbTotalCompleteTime * gamesProgressTiming.minutesPerInputUnit : null, { onlyHours: true })}
            </MediaInfoGridItem>
        </>
    );
};
