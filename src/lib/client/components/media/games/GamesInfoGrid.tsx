import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


export const GamesInfoGrid = ({ mediaType, media }: FamilyDetailsProps<typeof MediaType.GAMES>) => {
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
                {formatMinutes(media.hltbMainTime ? media.hltbMainTime * 60 : null, { onlyHours: true })}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB Main & Extra">
                {formatMinutes(media.hltbMainAndExtraTime ? media.hltbMainAndExtraTime * 60 : null, { onlyHours: true })}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="HLTB 100%">
                {formatMinutes(media.hltbTotalCompleteTime ? media.hltbTotalCompleteTime * 60 : null, { onlyHours: true })}
            </MediaInfoGridItem>
        </>
    );
};
