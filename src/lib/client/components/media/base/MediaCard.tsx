import React from "react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";


interface MediaCardProps {
    external?: boolean;
    className?: string;
    mediaType: MediaType;
    children: React.ReactNode;
    item: {
        mediaId: number;
        mediaName: string;
        imageCover?: string;
        mediaCover?: string;
    };
}


interface MediaCardTitleProps extends React.ComponentProps<"h3"> {
    lines?: 1 | 2;
    density?: "compact" | "default" | "strong";
}


export const MediaCard = ({ children, item, mediaType, className, external = false }: MediaCardProps) => {
    return (
        <article
            data-slot="media-card"
            className={cn(
                "group relative aspect-2/3 h-full overflow-hidden rounded-lg border bg-muted text-white " +
                "transition-all duration-300 hover:border-brand/50 focus-within:border-brand/50 focus-within:ring-2 " +
                "focus-within:ring-brand/30",
                className,
            )}
        >
            {external ?
                <Link
                    aria-label={`View ${item.mediaName}`}
                    to="/details/$mediaType/external/$apiId"
                    className="absolute inset-0 outline-none"
                    params={{ mediaType, apiId: item.mediaId.toString() }}
                >
                    <MediaCardImage item={item}/>
                </Link>
                :
                <Link
                    to="/details/$mediaType/$mediaId"
                    aria-label={`View ${item.mediaName}`}
                    className="absolute inset-0 outline-none"
                    params={{ mediaType, mediaId: item.mediaId }}
                >
                    <MediaCardImage item={item}/>
                </Link>
            }
            {children}
        </article>
    );
};


const MediaCardImage = ({ item }: Pick<MediaCardProps, "item">) => {
    return (
        <img
            loading="lazy"
            alt={item.mediaName}
            src={item.imageCover ?? item.mediaCover}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
        />
    );
};


export const MediaCardRightCorner = ({ children }: React.ComponentProps<"div">) => {
    return (
        <>
            <div
                className="absolute top-0 right-0 border-solid border-t-0 border-r-55 border-b-55 border-l-0
                border-[transparent_#030712] opacity-70 rounded-tr-md"
            />
            <div className="absolute top-2 right-2 z-10 flex max-w-[calc(100%-1rem)] items-start gap-1.5">
                {children}
            </div>
        </>
    );
}


export const MediaCardLeftCorner = ({ children, className, ...props }: React.ComponentProps<"div">) => {
    return (
        <div
            className={cn("pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] " +
                "items-start gap-1.5", className)}
            {...props}
        >
            <Badge variant="overlay">
                {children}
            </Badge>
        </div>
    );
}


export const MediaCardFooter = ({ density = "default", className, ...props }: React.ComponentProps<"div"> & { density?: "compact" | "default" }) => {
    return (
        <div
            data-density={density}
            data-slot="media-card-footer"
            className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-w-0 flex-col gap-1.5 " +
                "bg-linear-to-t from-black/95 via-black/65 to-transparent p-3 pt-10 " +
                "data-[density=compact]:gap-1 data-[density=compact]:p-2 data-[density=compact]:pt-8 " +
                "**:data-[slot=media-card-signals]:pointer-events-auto",
                className,
            )}
            {...props}
        />
    );
};


export const MediaCardTitle = ({ children, lines = 1, density = "default", className, ...props }: MediaCardTitleProps) => {
    return (
        <h3
            data-density={density}
            data-slot="media-card-title"
            className={cn(
                "min-w-0 font-semibold leading-tight data-[density=compact]:text-xs " +
                "data-[density=default]:text-sm data-[density=strong]:text-base sm:data-[density=strong]:text-lg",
                lines === 1 ? "truncate" : "line-clamp-2",
                className,
            )}
            {...props}
        >
            {children}
        </h3>
    );
};


export const MediaCardMeta = ({ className, ...props }: React.ComponentProps<"div">) => {
    return (
        <div
            data-slot="media-card-meta"
            className={cn("flex min-w-0 items-center justify-between gap-2 text-xs font-medium text-white/70", className)}
            {...props}
        />
    );
};


export const MediaCardDetails = ({ className, density = "default", children, ...props }: React.ComponentProps<"div"> & { density?: "default" | "compact" }) => {
    const items = React.Children.toArray(children).filter(Boolean);

    return (
        <div
            data-slot="media-card-details"
            className={cn("flex min-w-0 items-center", density === "compact" ? "gap-1" : "gap-2", className)}
            {...props}
        >
            {items.map((child, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 &&
                        <span aria-hidden="true" className="text-muted-foreground">
                            •
                        </span>
                    }
                    {child}
                </React.Fragment>
            ))}
        </div>
    );
};


export const MediaCardSignals = ({ className, ...props }: React.ComponentProps<"div">) => {
    return (
        <div
            data-slot="media-card-signals"
            className={cn("ml-auto flex shrink-0 items-center gap-2", className)}
            {...props}
        />
    );
};
