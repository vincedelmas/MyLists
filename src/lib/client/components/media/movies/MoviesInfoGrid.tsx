import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/date-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatCurrency} from "@/lib/utils/number-formatting";
import {formatLocaleName} from "@/lib/utils/text-formatting";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


export const MoviesInfoGrid = ({ mediaType, media }: KindDetailsProps<typeof MediaType.MOVIES>) => {
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
