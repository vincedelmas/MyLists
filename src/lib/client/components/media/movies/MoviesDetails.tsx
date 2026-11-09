import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Calendar, Clock} from "lucide-react";
import {Badge} from "@/lib/client/components/ui/badge";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {extractYear, formatDate} from "@/lib/utils/formatting/date";
import {formatMinutes, formatCurrency} from "@/lib/utils/formatting/number";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";
import {MediaUnderItem, MediaUnderRating, MediaInfoGridItem, UpComingAlert} from "@/lib/client/components/media/base/MediaDetailsComps";


type MoviesDetailsProps = MediaDetailsProps<typeof MediaType.MOVIES>;


export const MoviesOverTitle = ({ mediaType, media }: MoviesDetailsProps) => {
    return (
        <>
            {media.directorName &&
                <Badge variant="overlay">
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: media.directorName }}>
                        {media.directorName}
                    </Link>
                </Badge>
            }
        </>
    );
};


export const MoviesUnderTitle = ({ media }: MoviesDetailsProps) => {
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


export const MoviesInfoGrid = ({ mediaType, media }: MoviesDetailsProps) => {
    return (
        <>
            <MediaInfoGridItem label="Directed By">
                {media.directorName ?
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: media.directorName }}>
                        {media.directorName}
                    </Link>
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Composed By">
                {media.compositorName ?
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "compositor", name: media.compositorName }}>
                        {media.compositorName}
                    </Link>
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Release Date">
                {formatDate(media.releaseDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Original Lang.">
                {formatLocaleName(media.originalLanguage, "language")}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Runtime">
                {media.duration ?? DEFAULT_DASH_FALLBACK} min
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Total Budget">
                {formatCurrency(media.budget)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Total Revenue">
                {formatCurrency(media.revenue)}
            </MediaInfoGridItem>
        </>
    );
};


export const MoviesUpComingAlert = ({ media }: MoviesDetailsProps) => {
    return (
        <UpComingAlert
            title="Movie Premiere"
            dateString={media.releaseDate}
        />
    );
};
