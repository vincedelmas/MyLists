import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {extractYear} from "@/lib/utils/formatting/date";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {MediaInfoGridItem} from "@/lib/client/components/media/base/MediaDetailsComps";
import type {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";


type BooksDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


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
            <MediaInfoGridItem label="First Published">
                {extractYear(media.releaseDate)}
            </MediaInfoGridItem>
        </>
    );
};
