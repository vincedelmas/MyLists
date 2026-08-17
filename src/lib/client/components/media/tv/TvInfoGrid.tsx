import React from "react";
import {MediaType, TvMediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {formatDate} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {capitalize, formatLocaleName} from "@/lib/utils/text-formatting";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type TvDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const TvInfoGrid = ({ mediaType, media }: TvDetailsProps<TvMediaType>) => {
    const progressUnit = getMediaDefinition(mediaType).progress.unit!;
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
            <MediaInfoGridItem label={<EpsDurationLabel/>}>
                {media.duration ?? DEFAULT_DASH_FALLBACK} min
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Total Seasons">
                {media.totalSeasons ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label={`Total ${capitalize(progressUnit.plural)}`}>
                {media.totalEpisodes ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Completion">
                {formatMinutes(media.totalEpisodes * media.duration)}
            </MediaInfoGridItem>
        </>
    );
};


const EpsDurationLabel = () => {
    return (
        <span className="inline-flex items-center gap-1">
            Eps. Duration
            <InfoPopover label="Episode duration information" iconClassName="size-3.5">
                <div className="text-sm font-medium text-muted-foreground">
                    Episode duration
                </div>
                <div className="text-sm">
                    Approximate duration per episode. TV Shows with varying runtimes use an episode-weighted average.
                </div>
            </InfoPopover>
        </span>
    );
}
