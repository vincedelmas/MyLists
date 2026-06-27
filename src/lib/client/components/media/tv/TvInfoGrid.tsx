import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatLocaleName} from "@/lib/utils/text-formatting";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type TvDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["infoGrid"]>[number];


export const TvInfoGrid = ({ mediaType, media }: TvDetailsProps<typeof MediaType.SERIES | typeof MediaType.ANIME>) => {
    const creators = media.createdBy?.split(", ").map((c) => ({ name: c })) || [];

    return (
        <>
            <MediaInfoGridItem label="Prod. Status">
                {media.prodStatus}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Created By">
                {creators.length > 0 ?
                    creators.map((c) =>
                        <Link key={c.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: c.name }}>
                            <div key={c.name}>
                                {c.name}
                            </div>
                        </Link>
                    )
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Airing Dates">
                {formatDate(media.releaseDate)}
                <br/>
                {formatDate(media.lastAirDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Origin">
                {formatLocaleName(media.originCountry, "region")}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Eps. Duration">
                {media.duration ?? DEFAULT_DASH_FALLBACK} min
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Total Seasons">
                {media.totalSeasons ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Total Episodes">
                {media.totalEpisodes ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Completion">
                {formatMinutes(media.totalEpisodes * media.duration)}
            </MediaInfoGridItem>
        </>
    );
};
