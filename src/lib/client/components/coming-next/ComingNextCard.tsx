import {Calendar} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
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
        <Link to="/details/$mediaType/$mediaId" params={{ mediaType, mediaId: item.mediaId }}>
            <div className="flex flex-row h-32 border rounded-lg overflow-hidden hover:bg-popover/50 max-sm:h-full max-sm:flex-col hover:border-brand/50">
                <div className="relative h-full shrink-0 max-sm:h-32 max-sm:w-full">
                    <img
                        alt={item.mediaName}
                        src={item.imageCover}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <MediaTypeIcon
                                    size={16}
                                    mediaType={mediaType}
                                />
                                <h3 className="font-medium transition-colors line-clamp-1">
                                    {item.mediaName}
                                </h3>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {isTvShow && item.seasonToAir && item.episodeToAir ?
                                    <div className="flex items-center gap-2 text-foreground">
                                        <span>
                                            S{zeroPad(item.seasonToAir)}.E{zeroPad(item.episodeToAir)}
                                        </span>
                                        {item.episodeToAir === 1 &&
                                            <span className="rounded border border-destructive px-1.5 text-[10px] text-destructive">
                                                Premiere
                                            </span>
                                        }
                                    </div>
                                    :
                                    <span className="text-foreground">
                                        {mediaType === "games" ? "Releasing" : "Movie Premiere"}
                                    </span>
                                }
                            </div>
                        </div>
                        <MediaReleaseDate date={item.date}/>
                    </div>
                    <div className="flex items-end justify-between mt-3 pt-3 border-t">
                        <StatusBadge
                            status={item.status}
                        />
                        {relativeTime !== "never" &&
                            <Badge variant="outline" className="capitalize">
                                <Calendar data-icon="inline-start"/>
                                {relativeTime}
                            </Badge>
                        }
                    </div>
                </div>
            </div>
        </Link>
    );
};
