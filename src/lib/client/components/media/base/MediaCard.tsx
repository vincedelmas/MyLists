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
}


const MediaCardContext = React.createContext(false);
const MediaCardMetaContext = React.createContext(false);
const MediaCardFooterContext = React.createContext(false);


const useRequiredMediaCardContext = (context: React.Context<boolean>, component: string, parent: string) => {
    if (!React.useContext(context)) {
        throw new Error(`${component} must be used within ${parent}.`);
    }
};


export const MediaCard = ({ children, item, mediaType, className, external = false }: MediaCardProps) => {
    return (
        <MediaCardContext.Provider value={true}>
            <article
                data-slot="media-card"
                className={cn(
                    "@container/media-card group relative aspect-2/3 h-full overflow-hidden rounded-lg border bg-muted text-white " +
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
        </MediaCardContext.Provider>
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


export const MediaCardRightCorner = ({ children, className, ...props }: React.ComponentProps<"div">) => {
    return (
        <>
            <div
                aria-hidden="true"
                data-slot="media-card-right-corner-background"
                className="absolute right-0 top-0 rounded-tr-md border-solid border-t-0 border-r-44 border-b-44
                border-l-0 border-[transparent_#030712] opacity-70 @min-[128px]/media-card:border-r-54
                @min-[128px]/media-card:border-b-54 @min-[200px]/media-card:border-r-55
                @min-[200px]/media-card:border-b-55 @min-[250px]/media-card:border-r-64
                @min-[250px]/media-card:border-b-64"
            />
            <div
                data-slot="media-card-right-corner"
                className={cn(
                    "absolute right-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-start gap-1 " +
                    "[&_svg]:size-3.5! @min-[128px]/media-card:right-2 @min-[128px]/media-card:top-2 " +
                    "@min-[128px]/media-card:max-w-[calc(100%-1rem)] @min-[128px]/media-card:gap-1.5 " +
                    "@min-[128px]/media-card:[&_svg]:size-4! @min-[250px]/media-card:right-3 " +
                    "@min-[250px]/media-card:top-3 @min-[250px]/media-card:[&_svg]:size-5!",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </>
    );
}


export const MediaCardLeftCorner = ({ children, className, ...props }: React.ComponentProps<"div">) => {
    return (
        <div
            data-slot="media-card-left-corner"
            className={cn(
                "pointer-events-none absolute left-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-start gap-1 " +
                "@min-[128px]/media-card:left-2 @min-[128px]/media-card:top-2 " +
                "@min-[128px]/media-card:max-w-[calc(100%-1rem)] @min-[128px]/media-card:gap-1.5 " +
                "@min-[250px]/media-card:left-3 @min-[250px]/media-card:top-3",
                className,
            )}
            {...props}
        >
            <Badge
                variant="overlay"
                className="h-4 gap-0.5 px-1.5 text-[10px] [&>svg]:size-2.5! @min-[128px]/media-card:h-5
                @min-[128px]/media-card:gap-1 @min-[128px]/media-card:px-2 @min-[128px]/media-card:text-xs
                @min-[128px]/media-card:[&>svg]:size-3!"
            >
                {children}
            </Badge>
        </div>
    );
}


export const MediaCardFooter = ({ children, className, ...props }: React.ComponentProps<"div">) => {
    useRequiredMediaCardContext(MediaCardContext, "MediaCardFooter", "MediaCard");

    return (
        <MediaCardFooterContext.Provider value={true}>
            <div
                data-slot="media-card-footer"
                className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-w-0 flex-col gap-1 " +
                    "bg-linear-to-t from-black/95 via-black/65 to-transparent p-2 pt-8 " +
                    "@min-[128px]/media-card:gap-1.5 @min-[128px]/media-card:p-2.5 @min-[128px]/media-card:pt-9 " +
                    "@min-[200px]/media-card:p-3 @min-[200px]/media-card:pt-10 @min-[250px]/media-card:gap-2 " +
                    "@min-[250px]/media-card:p-4 @min-[250px]/media-card:pt-12 " +
                    "**:data-[slot=media-card-signals]:pointer-events-auto",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </MediaCardFooterContext.Provider>
    );
};


export const MediaCardTitle = ({ children, lines = 1, className, ...props }: MediaCardTitleProps) => {
    return (
        <h3
            data-slot="media-card-title"
            className={cn(
                "min-w-0 text-xs font-semibold leading-tight @min-[128px]/media-card:text-sm " +
                "@min-[250px]/media-card:text-lg",
                lines === 1 ? "truncate" : "line-clamp-2",
                className,
            )}
            {...props}
        >
            {children}
        </h3>
    );
};


export const MediaCardMeta = ({ children, className, ...props }: React.ComponentProps<"div">) => {
    useRequiredMediaCardContext(MediaCardFooterContext, "MediaCardMeta", "MediaCardFooter");

    return (
        <MediaCardMetaContext.Provider value={true}>
            <div
                data-slot="media-card-meta"
                className={cn(
                    "flex min-w-0 items-center justify-between gap-1 text-[10px] font-medium text-white/70 " +
                    "@min-[128px]/media-card:gap-1.5 @min-[128px]/media-card:text-xs @min-[200px]/media-card:gap-2",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </MediaCardMetaContext.Provider>
    );
};


export const MediaCardDetails = ({ className, children, ...props }: React.ComponentProps<"div">) => {
    useRequiredMediaCardContext(MediaCardMetaContext, "MediaCardDetails", "MediaCardMeta");
    const items = React.Children.toArray(children).filter(Boolean);

    return (
        <div
            data-slot="media-card-details"
            className={cn(
                "flex min-w-0 items-center gap-1 [&_svg]:size-3! @min-[128px]/media-card:gap-1.5 " +
                "@min-[128px]/media-card:[&_svg]:size-3.5! @min-[200px]/media-card:gap-2 " +
                "@min-[200px]/media-card:[&_svg]:size-4!",
                className,
            )}
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
    useRequiredMediaCardContext(MediaCardMetaContext, "MediaCardSignals", "MediaCardMeta");

    return (
        <div
            data-slot="media-card-signals"
            className={cn(
                "ml-auto flex shrink-0 items-center gap-1 [&_svg]:size-3! @min-[128px]/media-card:gap-1.5 " +
                "@min-[128px]/media-card:[&_svg]:size-3.5! @min-[200px]/media-card:gap-2 " +
                "@min-[200px]/media-card:[&_svg]:size-4!",
                className,
            )}
            {...props}
        />
    );
};
