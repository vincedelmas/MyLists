import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/date-formatting";
import {formatCurrency} from "@/lib/utils/number-formatting";
import {formatLocaleName} from "@/lib/utils/text-formatting";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type MoviesDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["infoGrid"]>[number];


export const MoviesInfoGrid = ({ mediaType, media }: MoviesDetailsProps<typeof MediaType.MOVIES>) => {
    return (
        <>
            <MediaInfoGridItem label="Directed By">
                {media.directorName ?
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: media.directorName }}>
                        {media.directorName}
                    </Link>
                    : "-"
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Composed By">
                {media.compositorName ?
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "compositor", name: media.compositorName }}>
                        {media.compositorName}
                    </Link>
                    : "-"
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Release Date">
                {formatDate(media.releaseDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Original Lang.">
                {formatLocaleName(media.originalLanguage, "language")}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Runtime">
                {media.duration ?? "-"} min
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
