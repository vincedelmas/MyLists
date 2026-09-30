import {cn} from "@/lib/utils/classnames";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/formatting/number";
import {ReleaseCalendarItem} from "@/lib/types/release-calendar.types";
import {StatusBadge} from "@/lib/client/components/general/StatusBadge";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";


export function ReleaseCalendarEvent({ item, compact = false }: { item: ReleaseCalendarItem; compact?: boolean }) {
    const isTv = item.mediaType === MediaType.SERIES || item.mediaType === MediaType.ANIME;

    const releaseLabel = isTv
        ? item.seasonToAir != null && item.episodeToAir != null
            ? `S${zeroPad(item.seasonToAir)} · E${zeroPad(item.episodeToAir)}`
            : "Next episode"
        : item.mediaType === MediaType.GAMES ? "Game release" : "Movie release";

    return (
        <Link
            to="/details/$mediaType/$mediaId"
            aria-label={`${item.mediaName}, ${releaseLabel}`}
            params={{ mediaType: item.mediaType, mediaId: item.mediaId }}
            className={cn("group/event flex min-w-0 gap-2 rounded-lg border bg-background p-2 shadow-xs transition-colors " +
                "hover:border-brand/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40",
                !compact && "flex-col gap-3 p-3",
            )}
        >
            <div className="flex min-w-0 items-start gap-2">
                <img
                    alt=""
                    loading="lazy"
                    src={item.imageCover}
                    className={cn("h-12 w-8 shrink-0 rounded object-cover", compact && "hidden h-9 w-6 xl:block")}
                />
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={cn("line-clamp-2 text-sm font-semibold leading-snug group-hover/event:text-brand", compact && "text-xs")}>
                        {item.mediaName}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <MediaTypeIcon mediaType={item.mediaType} size={12}/>
                        <span>{releaseLabel}</span>
                    </span>
                </div>
            </div>
            {!compact &&
                <StatusBadge
                    status={item.status}
                />
            }
        </Link>
    );
}
