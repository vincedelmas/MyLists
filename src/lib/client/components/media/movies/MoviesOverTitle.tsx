import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {MediaConfig} from "@/lib/client/components/media/media-config";


type MoviesDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["overTitle"]>[number];


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
