import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";


export const GamesOverTitle = ({ mediaType, media }: KindDetailsProps<typeof MediaType.GAMES>) => {
    const developers = media.companies ? media.companies.filter((c) => c.developer) : [];

    return (
        <>
            {developers.slice(0, 3).map((dev) =>
                <Badge key={dev.id} variant="black">
                    <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: dev.name }}>
                        {dev.name}
                    </Link>
                </Badge>
            )}
        </>
    );
};
