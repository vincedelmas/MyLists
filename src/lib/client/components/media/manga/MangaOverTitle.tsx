import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";
import {Badge} from "@/lib/client/components/ui/badge";
import {MediaConfig} from "@/lib/client/components/media/media-config";


type MangaDetailsProps<T extends MediaType> = Parameters<MediaConfig[T]["overTitle"]>[number];


export const MangaOverTitle = ({ mediaType, media }: MangaDetailsProps<typeof MediaType.MANGA>) => {
    const hasAuthors = (media.authors?.length ?? 0) > 0;

    return (
        <>
            <Badge variant="overlay">
                {media.prodStatus}
            </Badge>
            {hasAuthors &&
                <>
                    <span className="text-muted-foreground">•</span>
                    {media.authors?.slice(0, 2).map((author) =>
                        <Badge key={author.id} variant="overlay">
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
