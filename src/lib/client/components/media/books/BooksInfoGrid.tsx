import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {extractYear} from "@/lib/utils/date-formatting";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatMinutes} from "@/lib/utils/number-formatting";
import {formatLocaleName} from "@/lib/utils/text-formatting";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";


type BooksDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["infoGrid"]>[number];


export const BooksInfoGrid = ({ mediaType, media }: BooksDetailsProps<typeof MediaType.BOOKS>) => {
    return (
        <>
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
                {media.publishers ?? DEFAULT_DASH_FALLBACK}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Release Date">
                {extractYear(media.releaseDate)}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Language">
                {formatLocaleName(media.language, "language")}
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Total Pages">
                {media.pages ?? DEFAULT_DASH_FALLBACK} p.
            </MediaInfoGridItem>
            <MediaInfoGridItem label="Completion">
                {formatMinutes(media.pages * 1.7)}
            </MediaInfoGridItem>
        </>
    );
};
