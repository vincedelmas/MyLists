import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {formatDate} from "@/lib/utils/date-formatting";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type MangaDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["infoGrid"]>[number];


export const MangaInfoGrid = ({ mediaType, media }: MangaDetailsProps<typeof MediaType.MANGA>) => {
    return (
        <>
            <MediaInfoGridItem label="Prod. Status">
                {media.prodStatus}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Authored By">
                {media.authors && media.authors.length > 0 ?
                    media.authors.slice(0, 3).map((author) =>
                        <Link key={author.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: author.name }}>
                            <div>{author.name}</div>
                        </Link>
                    )
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Published By">
                {media.publishers ?
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "publisher", name: media.publishers }}>
                        {media.publishers}
                    </Link>
                    : DEFAULT_DASH_FALLBACK
                }
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Releasing Dates">
                {formatDate(media.releaseDate)}
                <br/>
                {formatDate(media.endDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Total Chapters">
                {media.chapters ?? DEFAULT_DASH_FALLBACK} chapters
            </MediaInfoGridItem>
            <MediaInfoGridItem label=" Total Volumes">
                {media.volumes ?? DEFAULT_DASH_FALLBACK} volumes
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Completion">
                {formatMinutes(media.chapters ? media.chapters * 7 : null)}
            </MediaInfoGridItem>
        </>
    );
};
