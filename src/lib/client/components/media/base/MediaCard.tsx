import React from "react";
import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";


interface MediaCardItem {
    mediaName: string;
    imageCover?: string;
    mediaCover?: string;
    mediaId: number | string;
}


interface MediaCardBaseProps {
    className?: string;
    mediaType: MediaType;
    children: React.ReactNode;
    "aria-labelledby"?: string;
    layout?: "overlay" | "poster";
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}


interface MediaCardStaticProps extends React.ComponentProps<"article"> {
    item: MediaCardItem;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}


interface MediaCardTitleProps extends React.ComponentProps<"h3"> {
    lines?: 1 | 2;
}


type MediaCardProps = MediaCardBaseProps & (
    | { external: true; item: MediaCardItem }
    | { external?: false; item: MediaCardItem & { mediaId: number } }
    );


const MediaCardContext = React.createContext(false);
const MediaCardMetaContext = React.createContext(false);
const MediaCardFooterContext = React.createContext(false);
const MediaCardLayoutContext = React.createContext("overlay");


const useRequiredMediaCardContext = (context: React.Context<boolean>, component: string, parent: string) => {
    if (!React.useContext(context)) {
        throw new Error(`${component} must be used within ${parent}.`);
    }
};


const MediaCardFrame = ({ children, className, ...props }: React.ComponentProps<"article">) => {
    return (
        <article
            data-slot="media-card"
            className={cn(
                "@container/media-card group relative aspect-2/3 h-full overflow-hidden rounded-xl border bg-muted text-white " +
                "transition-all duration-300 hover:border-brand/50",
                className,
            )}
            {...props}
        >
            {children}
        </article>
    );
};


export const MediaCard = (props: MediaCardProps) => {
    const { children, mediaType, className, layout = "overlay" } = props;

    return (
        <MediaCardContext.Provider value={true}>
            <MediaCardLayoutContext.Provider value={layout}>
                <MediaCardFrame
                    aria-labelledby={props["aria-labelledby"]}
                    className={cn(layout === "poster"
                        && "aspect-auto h-auto overflow-visible rounded-none border-0 bg-transparent text-foreground", className)}
                >
                    {props.external ?
                        <Link
                            onClick={props.onClick}
                            to="/details/$mediaType/external/$apiId"
                            className="absolute inset-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground"
                            aria-label={`View ${props.item.mediaName}`}
                            params={{ mediaType, apiId: props.item.mediaId.toString() }}
                        >
                            <MediaCardImage
                                item={props.item}
                            />
                        </Link>
                        :
                        <Link
                            onClick={props.onClick}
                            to="/details/$mediaType/$mediaId"
                            className="absolute inset-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground"
                            aria-label={`View ${props.item.mediaName}`}
                            params={{ mediaType, mediaId: props.item.mediaId }}
                        >
                            <MediaCardImage item={props.item}/>
                        </Link>
                    }
                    {layout === "poster" && <div aria-hidden="true" className="pointer-events-none aspect-2/3"/>}
                    {children}
                </MediaCardFrame>
            </MediaCardLayoutContext.Provider>
        </MediaCardContext.Provider>
    );
};


export const MediaCardStatic = ({ children, fallback, item, ...props }: MediaCardStaticProps) => {
    return (
        <MediaCardContext.Provider value={true}>
            <MediaCardFrame {...props}>
                {item.imageCover || item.mediaCover
                    ? <MediaCardImage item={item}/>
                    : fallback
                }
                {children}
            </MediaCardFrame>
        </MediaCardContext.Provider>
    );
};


const MediaCardImage = ({ item }: { item: MediaCardItem }) => {
    const layout = React.useContext(MediaCardLayoutContext);
    return (
        <img
            loading="lazy"
            alt={item.mediaName}
            src={item.imageCover ?? item.mediaCover}
            className={cn(
                "size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]",
                layout === "poster" && "aspect-2/3 h-auto rounded-lg shadow-sm transition-[box-shadow,filter] duration-300 group-hover:scale-100 group-hover:shadow-lg group-hover:shadow-black/20 group-hover:brightness-105 motion-reduce:transition-none",
            )}
        />
    );
};


export const MediaCardRightCorner = ({ children, className, ...props }: React.ComponentProps<"div">) => {
    const layout = React.useContext(MediaCardLayoutContext);
    return (
        <>
            <div
                aria-hidden="true"
                data-slot="media-card-right-corner-background"
                className={cn(
                    "absolute right-0 top-0 border-solid border-t-0 border-l-0 border-[transparent_var(--background)] opacity-70",
                    layout === "poster"
                        ? "hidden"
                        : "rounded-tr-md border-r-44 border-b-44 @min-[128px]/media-card:border-r-54 " +
                        "@min-[128px]/media-card:border-b-54 @min-[200px]/media-card:border-r-55 " +
                        "@min-[200px]/media-card:border-b-55 @min-[250px]/media-card:border-r-64 " +
                        "@min-[250px]/media-card:border-b-64",
                )}
            />
            <div
                data-slot="media-card-right-corner"
                className={cn(
                    "absolute z-10 flex items-start gap-1",
                    layout === "poster"
                        ? "right-1.5 top-1.5 max-w-[calc(100%-0.75rem)] items-center text-white " +
                        "[&>button]:flex [&>button]:size-7 [&>button]:items-center [&>button]:justify-center " +
                        "[&>button]:rounded-full [&>button]:border [&>button]:border-white/15 " +
                        "[&>button]:bg-black/55 [&>button]:backdrop-blur-md [&>button]:hover:bg-black/80 [&_svg]:size-3!"
                        : "right-1.5 top-1.5 max-w-[calc(100%-0.75rem)] [&_svg]:size-3.5! " +
                        "@min-[128px]/media-card:right-2 @min-[128px]/media-card:top-2 " +
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
    const layout = React.useContext(MediaCardLayoutContext);
    return (
        <div
            data-slot="media-card-left-corner"
            className={cn(
                "pointer-events-none absolute left-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-start gap-1 " +
                "@min-[128px]/media-card:left-2 @min-[128px]/media-card:top-2 " +
                "@min-[128px]/media-card:max-w-[calc(100%-1rem)] @min-[128px]/media-card:gap-1.5 " +
                "@min-[250px]/media-card:left-3 @min-[250px]/media-card:top-3",
                layout === "poster" && "@min-[128px]/media-card:left-1.5 @min-[128px]/media-card:top-1.5 " +
                "@min-[250px]/media-card:left-1.5 @min-[250px]/media-card:top-1.5 " +
                "@min-[128px]/media-card:max-w-[calc(100%-0.75rem)]",
                className,
            )}
            {...props}
        >
            <Badge
                variant="overlay"
                className={cn(
                    "h-4 gap-0.5 px-1.5 text-[10px] [&>svg]:size-2.5! @min-[128px]/media-card:h-5 " +
                    "@min-[128px]/media-card:gap-1 @min-[128px]/media-card:px-2 @min-[128px]/media-card:text-xs " +
                    "@min-[128px]/media-card:[&>svg]:size-3!",
                    layout === "poster" && "text-[11px] @min-[128px]/media-card:text-[11px]",
                )}
            >
                {children}
            </Badge>
        </div>
    );
}


export const MediaCardFooter = ({ children, className, ...props }: React.ComponentProps<"div">) => {
    useRequiredMediaCardContext(MediaCardContext, "MediaCardFooter", "MediaCard");
    const layout = React.useContext(MediaCardLayoutContext);

    return (
        <MediaCardFooterContext.Provider value={true}>
            <div
                data-slot="media-card-footer"
                className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-w-0 flex-col gap-1 " +
                    "bg-linear-to-t from-black/95 via-black/65 to-transparent p-2 pt-8 " +
                    "@min-[128px]/media-card:gap-1.5 @min-[128px]/media-card:p-2.5 @min-[128px]/media-card:pt-9 " +
                    "@min-[200px]/media-card:p-3 @min-[200px]/media-card:pt-10 " +
                    "@min-[250px]/media-card:gap-2 @min-[250px]/media-card:p-4 @min-[250px]/media-card:pt-12 " +
                    "**:data-[slot=media-card-signals]:pointer-events-auto",
                    layout === "poster" && "relative inset-auto gap-1.5 bg-none px-0.5 pt-2 pb-0 " +
                    "@min-[128px]/media-card:px-0.5 @min-[128px]/media-card:pt-2 @min-[128px]/media-card:pb-0 " +
                    "@min-[200px]/media-card:px-0.5 @min-[200px]/media-card:pt-2 @min-[200px]/media-card:pb-0 " +
                    "@min-[250px]/media-card:px-0.5 @min-[250px]/media-card:pt-2 @min-[250px]/media-card:pb-0",
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
                "min-w-0 text-xs font-semibold leading-tight " +
                "@min-[128px]/media-card:text-sm " +
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
    const layout = React.useContext(MediaCardLayoutContext);
    useRequiredMediaCardContext(MediaCardFooterContext, "MediaCardMeta", "MediaCardFooter");

    return (
        <MediaCardMetaContext.Provider value={true}>
            <div
                data-slot="media-card-meta"
                className={cn(
                    "flex min-w-0 items-center justify-between gap-1 text-[10px] font-medium text-white/70 " +
                    "@min-[128px]/media-card:gap-1.5 @min-[128px]/media-card:text-xs @min-[200px]/media-card:gap-2",
                    layout === "poster" && "text-muted-foreground",
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
                "flex min-w-0 items-center gap-1 [&_svg]:size-3! " +
                "@min-[128px]/media-card:gap-1.5 @min-[128px]/media-card:[&_svg]:size-3.5! " +
                "@min-[200px]/media-card:gap-2 @min-[200px]/media-card:[&_svg]:size-4!",
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
