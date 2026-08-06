import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {MediaDetailsProps} from "@/lib/client/components/media/media-config.types";


type TvDetailsProps<T extends MediaType> = MediaDetailsProps<T>;


export const TvOverTitle = ({ mediaType, media }: TvDetailsProps<TvMediaType>) => {
    const hasNetwork = (media.networks?.length ?? 0) > 0;

    return (
        <>
            <Badge variant="overlay">
                {media.prodStatus}
            </Badge>
            {hasNetwork &&
                <>
                    <span className="text-muted-foreground">•</span>
                    {media.networks?.slice(0, 2).map((net) =>
                        <Badge key={net.id} variant="overlay">
                            <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "platform", name: net.name }}>
                                {net.name}
                            </Link>
                        </Badge>
                    )}
                </>
            }
        </>
    );
};
