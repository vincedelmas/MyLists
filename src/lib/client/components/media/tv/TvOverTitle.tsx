import React from "react";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";


export const TvOverTitle = ({ mediaType, media }: FamilyDetailsProps<TvMediaType>) => {
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
