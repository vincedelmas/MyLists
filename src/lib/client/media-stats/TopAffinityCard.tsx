import React from "react";
import {Link} from "@tanstack/react-router";
import {capitalize} from "@/lib/utils/text-formatting";
import {TopAffinity} from "@/lib/types/stats.types";
import {JobType, MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {CircleHelp, CircleOff, Heart, Play, Star} from "lucide-react";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";


interface TopAffinityCardProps {
    title: string;
    job?: JobType;
    mediaType?: MediaType;
    topAffinity: TopAffinity;
}


export const TopAffinityCard = ({ title, topAffinity, job, mediaType }: TopAffinityCardProps) => (
    <Card>
        <CardHeader>
            <CardTitle>
                Top {title}
            </CardTitle>
            <CardAction>
                <AffinityPopover/>
            </CardAction>
        </CardHeader>
        <CardContent className="space-y-2 overflow-y-auto scrollbar-thin max-h-67">
            {topAffinity.length === 0 ?
                <EmptyState
                    icon={CircleOff}
                    className="py-4"
                    message=" No data available."
                />
                :
                topAffinity.map((item, idx) =>
                    <div key={item.name} className="flex items-center justify-between rounded-md px-2 py-1.5
                        transition-colors hover:bg-muted/50">
                        <div className="flex min-w-0 items-center gap-2">
                                <span className="w-5 text-sm text-muted-foreground">
                                    {idx + 1}.
                                </span>
                            <div className="flex flex-col min-w-0">
                                <span className="truncate text-sm font-medium">
                                    {job && mediaType ?
                                        <Link to="/details/$mediaType/$job/$name" params={{ mediaType, job, name: item.name }}>
                                            <>{capitalize(item.name)}</>
                                        </Link>
                                        :
                                        <>{capitalize(item.name)}</>
                                    }
                                </span>
                                {item.metadata &&
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Play className="size-3"/>
                                            {item.metadata.entriesCount}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Heart className="size-3 text-red-500"/>
                                            {item.metadata.favoriteCount}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Star className="size-3 text-app-rating"/>
                                            {item.metadata.avgRating}
                                        </span>
                                    </div>
                                }
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="ml-2 shrink-0">
                                {item.value}
                            </Badge>
                        </div>
                    </div>
                )
            }
        </CardContent>
    </Card>
);


const AffinityPopover = () => {
    return (
        <Popover>
            <PopoverTrigger className="opacity-70 hover:opacity-100">
                <CircleHelp className="size-4"/>
            </PopoverTrigger>
            <PopoverContent className="w-75">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                    Affinity Score <span className="-ml-1 text-sm text-destructive">*</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-3">
                    <p>A score (0-10) representing the preference for a category based on:</p>
                    <ul className="space-y-2 list-none border-l-2 border-muted pl-3">
                        <li>
                            <span className="font-medium text-foreground block">
                                1. Ratings
                            </span>
                            How much higher the rated items are compared to the average.
                        </li>
                        <li>
                            <span className="font-medium text-foreground block">
                                2. Favorites
                            </span>
                            Multiplicative bonus points for entries marked as favorites.
                        </li>
                        <li>
                            <span className="font-medium text-foreground block">
                                3. Volume
                            </span>
                            The more watch or read, the more accurate the score.
                        </li>
                    </ul>
                    <p className="italic text-xs pt-2 border-t">
                        <span className="text-sm text-destructive">*</span>{" "}
                        Requires at least 3 entries to appear.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
};
