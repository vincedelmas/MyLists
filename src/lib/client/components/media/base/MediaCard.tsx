import React from "react";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {Link} from "@tanstack/react-router";


interface MediaCardProps {
    external?: boolean;
    className?: string;
    showShade?: boolean;
    mediaType: MediaType;
    children: React.ReactNode;
    item: {
        mediaId: number;
        mediaName: string;
        imageCover?: string;
        mediaCover?: string;
    };
}


export const MediaCard = ({ children, item, mediaType, className, showShade, external = false }: MediaCardProps) => {
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
        <div className={cn("group relative aspect-2/3 h-full overflow-hidden rounded-lg border " +
            "text-white transition-all duration-300 hover:border-brand/50", className)}
        >
            {external ?
                <Link to="/details/$mediaType/external/$apiId" params={{ mediaType, apiId: item.mediaId.toString() }}>
                    {image}
                </Link>
                :
                <Link to="/details/$mediaType/$mediaId" params={{ mediaType, mediaId: item.mediaId }}>
                    {image}
                </Link>
            }

            {showShade &&
                <div
                    className="absolute top-0 right-0 border-solid border-t-0 border-r-55 border-b-55 border-l-0
                    border-[transparent_#030712] opacity-70 rounded-tr-md"
                />
            }

            {children}
        </div>
    );
};
