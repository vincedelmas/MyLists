import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {MediaConfig} from "@/lib/client/components/media/media-config";


type TvDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["overTitle"]>[number];


export const TvOverTitle = ({ mediaType, media }: TvDetailsProps<TvMediaType>) => {
    const hasNetwork = (media.networks?.length ?? 0) > 0;

    return (
        <>
            <Badge variant="black">
                {media.prodStatus}
            </Badge>
            {hasNetwork &&
                <>
                    <span className="text-muted-foreground">•</span>
                    {media.networks?.slice(0, 2).map((net) =>
                        <Badge key={net.id} variant="black">
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
