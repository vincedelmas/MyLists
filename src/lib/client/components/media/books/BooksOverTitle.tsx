import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";


type BooksDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const BooksOverTitle = ({ mediaType, media }: BooksDetailsProps<typeof MediaType.BOOKS>) => {
    return (
        <>
            {media.authors?.slice(0, 3).map((author) =>
                <Badge key={author.id} variant="overlay">
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: author.name }}>
                        {author.name}
                    </Link>
                </Badge>
            )}
        </>
    );
};
