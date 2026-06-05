import {Calendar} from "lucide-react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {Badge} from "@/lib/client/components/ui/badge";
import {ComingNextItem} from "@/lib/types/query.options.types";
import {StatusBadge} from "@/lib/client/components/general/StatusBadge";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {extractYear, formatCalendarRelativeDate, formatDate} from "@/lib/utils/date-formatting";


export const ComingNextCard = ({ item, mediaType }: { item: ComingNextItem, mediaType: MediaType }) => {
    const { relativeTime } = formatCalendarRelativeDate(item.date, { style: "long" });
    const isTvShow = (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME);

    return (
        <Link search={{ external: false }} to="/details/$mediaType/$mediaId" params={{ mediaType, mediaId: item.mediaId }}>
            <div className="flex flex-row h-32 border rounded-lg overflow-hidden hover:bg-popover/50 max-sm:h-full max-sm:flex-col">
                <div className="relative h-full shrink-0 max-sm:h-32 max-sm:w-full">
                    <img
                        alt={item.mediaName}
                        src={item.imageCover}
                        className="w-full h-full object-cover"
                    />

                    <div className="md:hidden absolute top-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-md text-[10px]
                    font-bold tracking-wider text-muted-foreground border capitalize">
                        {mediaType}
                    </div>
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="hidden md:flex items-center justify-center size-4">
                                    <MainThemeIcon
                                        type={mediaType}
                                    />
                                </span>
                                <h3 className="font-medium transition-colors line-clamp-1">
                                    {item.mediaName}
                                </h3>
                            </div>

                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {isTvShow && item.seasonToAir && item.episodeToAir ?
                                    <div className="flex items-center gap-2 text-primary">
                                        <span>
                                            S{zeroPad(item.seasonToAir)}.E{zeroPad(item.episodeToAir)}
                                        </span>
                                        {item.episodeToAir === 1 &&
                                            <span className="text-[10px] text-destructive px-1.5 rounded border border-red-500">
                                                Premiere
                                            </span>
                                        }
                                    </div>
                                    :
                                    <span className="text-primary">
                                        {mediaType === "games" ? "Releasing" : "Movie Premiere"}
                                    </span>
                                }
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="text-lg font-bold">
                                {formatDate(item.date)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {extractYear(item.date)}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-end justify-between mt-3 pt-3 border-t">
                        <StatusBadge
                            status={item.status}
                        />
                        {relativeTime !== "never" &&
                            <Badge variant="black" className="capitalize">
                                <Calendar/>
                                <span>{relativeTime}</span>
                            </Badge>
                        }
                    </div>
                </div>
            </div>
        </Link>
    );
};
