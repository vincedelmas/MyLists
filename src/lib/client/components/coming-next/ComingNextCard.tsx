import {Calendar} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {capitalize} from "@/lib/utils/text-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {ComingNextItem} from "@/lib/types/query.options.types";
import {formatCalendarRelativeDate} from "@/lib/utils/date-formatting";
import {StatusBadge} from "@/lib/client/components/general/StatusBadge";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";


export const ComingNextCard = ({ item, mediaType }: { item: ComingNextItem, mediaType: MediaType }) => {
    const { relativeTime } = formatCalendarRelativeDate(item.date, { style: "long" });
    const isTvShow = (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME);

    return (
        <Link
            to="/details/$mediaType/$mediaId"
            params={{ mediaType, mediaId: item.mediaId }}
            className="group/card block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-brand/40"
        >
            <article className="grid h-full min-h-36 grid-cols-[5.75rem_minmax(0,1fr)] overflow-hidden rounded-xl border shadow-xs
            transition-colors group-hover/card:border-brand/50">
                <div className="relative min-h-36 overflow-hidden bg-muted">
                    <img
                        loading="lazy"
                        alt=""
                        src={item.imageCover}
                        className="size-full object-cover transition-transform duration-500 group-hover/card:scale-[1.025]"
                    />
                </div>
                <div className="flex min-w-0 flex-col p-3.5">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="flex min-w-0 items-center gap-1.5 font-medium capitalize">
                            <MediaTypeIcon size={14} mediaType={mediaType}/>
                            <span className="truncate">{capitalize(mediaType)}</span>
                        </span>
                        <span className="shrink-0">
                            <MediaReleaseDate date={item.date}/>
                        </span>
                    </div>

                    <h3 className="mt-2 line-clamp-2 font-semibold leading-snug text-foreground transition-colors group-hover/card:text-brand">
                        {item.mediaName}
                    </h3>

                    <div className="mt-1.5 flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
                        {isTvShow && item.seasonToAir && item.episodeToAir
                            ?
                            <>
                                <span className="font-medium tabular-nums text-foreground">
                                    S{zeroPad(item.seasonToAir)}.E{zeroPad(item.episodeToAir)}
                                </span>
                                {item.episodeToAir === 1 &&
                                    <Badge variant="destructive">
                                        Premiere
                                    </Badge>
                                }
                            </>
                            :
                            <span>
                                {mediaType === MediaType.GAMES ? "Game release" : "Movie premiere"}
                            </span>
                        }
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <StatusBadge
                            status={item.status}
                        />
                        {relativeTime !== "never" &&
                            <Badge variant="outline" className="max-w-full capitalize">
                                <Calendar data-icon="inline-start"/>
                                <span className="truncate">{relativeTime}</span>
                            </Badge>
                        }
                    </div>
                </div>
            </article>
        </Link>
    );
};
