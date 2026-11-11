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
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}


interface MediaCardTitleProps extends React.ComponentProps<"h3"> {
    lines?: 1 | 2;
}


type MediaCardProps = MediaCardBaseProps & (
    | { external: true; item: MediaCardItem }
    | { external?: false; item: MediaCardItem & { mediaId: number } }
    );


export const MediaCard = (props: MediaCardProps) => {
    const { children, mediaType, className, item } = props;
    const linkClassName = "absolute inset-0 rounded-lg outline-none focus-visible:outline-2 " +
        "focus-visible:outline-offset-2 focus-visible:outline-muted-foreground";

    const cover = (
        <img
            loading="lazy"
            alt={item.mediaName}
            src={item.imageCover ?? item.mediaCover}
            className="aspect-2/3 h-auto w-full rounded-lg object-cover shadow-[0_4px_12px_-2px_rgb(0_0_0/0.45)]
            transition-[box-shadow,filter] duration-300 group-hover:shadow-[0_8px_20px_-4px_rgb(0_0_0/0.6)]
            group-hover:brightness-105 motion-reduce:transition-none"
        />
    );

    return (
        <article
            data-slot="media-card"
            aria-labelledby={props["aria-labelledby"]}
            className={cn("@container/media-card group relative min-w-0 text-foreground", className)}
        >
            {props.external ?
                <Link
                    onClick={props.onClick}
                    className={linkClassName}
                    title={item.mediaName}
                    aria-label={`View ${item.mediaName}`}
                    to="/details/$mediaType/external/$apiId"
                    params={{ mediaType, apiId: item.mediaId.toString() }}
                >
                    {cover}
                </Link>
                :
                <Link
                    onClick={props.onClick}
                    className={linkClassName}
                    to="/details/$mediaType/$mediaId"
                    title={item.mediaName}
                    aria-label={`View ${item.mediaName}`}
                    params={{ mediaType, mediaId: props.item.mediaId }}
                >
                    {cover}
                </Link>
            }
            <div
                aria-hidden="true"
                className="pointer-events-none aspect-2/3"
            />
            {children}
        </article>
    );
};


export const MediaCardRightCorner = ({ className, ...props }: React.ComponentProps<"div">) => (
    <div
        data-slot="media-card-right-corner"
        className={cn(
            "absolute right-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-center gap-1 text-white " +
            "[&>button]:flex [&>button]:size-7 [&>button]:items-center [&>button]:justify-center " +
            "[&>button]:rounded-full [&>button]:border [&>button]:border-white/15 " +
            "[&>button]:bg-black/55 [&>button]:backdrop-blur-md [&>button]:hover:bg-black/80 [&_svg]:size-3!",
            className,
        )}
        {...props}
    />
);


export const MediaCardLeftCorner = ({ children, className, ...props }: React.ComponentProps<"div">) => (
    <div
        data-slot="media-card-left-corner"
        className={cn(
            "pointer-events-none absolute left-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-start gap-1 " +
            "@min-[128px]/media-card:gap-1.5",
            className,
        )}
        {...props}
    >
        <Badge
            variant="overlay"
            className="h-4 gap-0.5 px-1.5 text-[11px] [&>svg]:size-2.5!
            @min-[128px]/media-card:h-5 @min-[128px]/media-card:gap-1
            @min-[128px]/media-card:px-2 @min-[128px]/media-card:[&>svg]:size-3!"
        >
            {children}
        </Badge>
    </div>
);


export const MediaCardBadge = ({ className, ...props }: React.ComponentProps<typeof Badge>) => (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-2/3 items-end p-1.5">
        <Badge
            variant="overlay"
            className={cn("h-6 max-w-full gap-1.5 border-white/10 bg-black/70 px-2 text-[11px] shadow-sm backdrop-blur-md", className)}
            {...props}
        />
    </div>
);


export const MediaCardFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
    <div
        data-slot="media-card-footer"
        className={cn(
            "pointer-events-none relative z-10 flex min-w-0 flex-col gap-1.5 px-0.5 pt-2 " +
            "@min-[250px]/media-card:gap-2 **:data-[slot=media-card-signals]:pointer-events-auto",
            className,
        )}
        {...props}
    />
);


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


export const MediaCardMeta = ({ className, ...props }: React.ComponentProps<"div">) => (
    <div
        data-slot="media-card-meta"
        className={cn(
            "flex min-w-0 items-center justify-between gap-1 text-[10px] font-medium text-muted-foreground " +
            "@min-[128px]/media-card:gap-1.5 @min-[128px]/media-card:text-xs " +
            "@min-[200px]/media-card:gap-2",
            className,
        )}
        {...props}
    />
);


export const MediaCardDetails = ({ className, children, ...props }: React.ComponentProps<"div">) => {
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
    return (
        <div
            data-slot="media-card-signals"
            className={cn(
                "ml-auto flex shrink-0 items-center gap-1 [&_svg]:size-3! " +
                "@min-[128px]/media-card:gap-1.5 @min-[128px]/media-card:[&_svg]:size-3.5! " +
                "@min-[200px]/media-card:gap-2 @min-[200px]/media-card:[&_svg]:size-4!",
                className,
            )}
            {...props}
        />
    );
};
