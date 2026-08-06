import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";


type MoviesDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const MoviesOverTitle = ({ mediaType, media }: MoviesDetailsProps<typeof MediaType.MOVIES>) => {
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
