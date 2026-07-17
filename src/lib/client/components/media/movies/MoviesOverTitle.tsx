import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";


export const MoviesOverTitle = ({ mediaType, media }: FamilyDetailsProps<typeof MediaType.MOVIES>) => {
    return (
        <>
            {media.directorName &&
                <Badge variant="black">
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: media.directorName }}>
                        {media.directorName}
                    </Link>
                </Badge>
            }
        </>
    );
};
