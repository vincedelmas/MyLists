import React from "react";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";


interface MediaCardProps {
    external?: boolean;
    mediaType: MediaType;
    children: React.ReactNode;
    item: {
        mediaId: number;
        mediaName: string;
        imageCover?: string;
        mediaCover?: string;
    };
}


export const MediaCard = ({ children, item, mediaType, external = false }: MediaCardProps) => {
    const image = (
        <>
            <img
                loading="lazy"
                alt={item.mediaName}
                src={item.imageCover ?? item.mediaCover}
                className="object-cover w-full h-full transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent"/>
        </>
    );

    return (
        <div className="group relative aspect-2/3 h-full rounded-lg border overflow-hidden transition-all duration-300 hover:border-app-accent/50">
            {external ?
                <Link to="/details/$mediaType/external/$apiId" params={{ mediaType, apiId: item.mediaId.toString() }}>
                    {image}
                </Link>
                :
                <Link to="/details/$mediaType/$mediaId" params={{ mediaType, mediaId: item.mediaId }}>
                    {image}
                </Link>
            }
            {children}
        </div>
    );
};
