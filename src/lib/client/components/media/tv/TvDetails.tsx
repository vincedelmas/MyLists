import {Link} from "@tanstack/react-router";
import {TvMediaType} from "@/lib/utils/enums";
import {Calendar, Clock, Tv} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {extractYear, formatDate} from "@/lib/utils/formatting/date";
import {formatMinutes, zeroPad} from "@/lib/utils/formatting/number";
import {InfoPopover} from "@/lib/client/components/general/InfoPopover";
import {capitalize, formatLocaleName} from "@/lib/utils/formatting/text";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {MediaUnderItem, MediaUnderRating, MediaInfoGridItem, UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type TvDetailsProps = MediaDetailsProps<TvMediaType>;


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


export const TvOverTitle = ({ mediaType, media }: TvDetailsProps) => {
    const hasNetwork = (media.networks?.length ?? 0) > 0;

    return (
        <>
            <Badge variant="overlay">
                {media.prodStatus}
            </Badge>
            {hasNetwork &&
                <>
                    <span className="text-muted-foreground">•</span>
                    {media.networks?.slice(0, 2).map((net) =>
                        <Badge key={net.id} variant="overlay">
                            <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "platform", name: net.name }}>
                                {net.name}
                            </Link>
                        </Badge>
                    )}
                </>
            }
        </>
    );
};


export const TvUnderTitle = ({ media }: TvDetailsProps) => {
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


export const TvInfoGrid = ({ mediaType, media }: TvDetailsProps) => {
    const progressUnit = getMediaDefinition(mediaType).progress.unit;
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


export const TvUpComingAlert = ({ media }: TvDetailsProps) => {
    return (
        <UpComingAlert title="Next Episode" dateString={media.nextEpisodeToAir}>
            S{zeroPad(media.seasonToAir)}.E{zeroPad(media.episodeToAir)}
        </UpComingAlert>
    );
};
