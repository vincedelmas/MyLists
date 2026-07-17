import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {FamilyDetailsProps} from "@/lib/client/components/media/family-component.types";


export const MangaOverTitle = ({ mediaType, media }: FamilyDetailsProps<typeof MediaType.MANGA>) => {
    const hasAuthors = (media.authors?.length ?? 0) > 0;

    return (
        <>
            <Badge variant="black">
                {media.prodStatus}
            </Badge>
            {hasAuthors &&
                <>
                    <span className="text-muted-foreground">•</span>
                    {media.authors?.slice(0, 2).map((author) =>
                        <Badge key={author.id} variant="black">
                            <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job: "creator", name: author.name }}>
                                {author.name}
                            </Link>
                        </Badge>
                    )}
                </>
            }
        </>
    );
};
