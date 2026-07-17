import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";


export const BooksOverTitle = ({ mediaType, media }: KindDetailsProps<typeof MediaType.BOOKS>) => {
    return (
        <>
            {media.authors?.slice(0, 3).map((author) =>
                <Badge key={author.id} variant="black">
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: author.name }}>
                        {author.name}
                    </Link>
                </Badge>
            )}
        </>
    );
};
