import {HeartOff, TrendingUp} from "lucide-react";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {MediaCard} from "@/lib/client/components/media/base/MediaCard";
import {Card, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";


interface HighlightedMediaProps {
    config: ResolvedHighlightedMediaTabConfig;
}


export const HighlightedMedia = ({ config }: HighlightedMediaProps) => {
    const isBelowLg = useBreakpoint("lg");
    const itemsToDisplay = config.items.slice(0, isBelowLg ? 4 : 7);

    if (config.mode === "disabled") return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm text-primary font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-app-accent"/>
                    {config.title}
                </CardTitle>
            </CardHeader>
            <div className="grid grid-cols-7 gap-2 -mt-1 max-lg:grid-cols-4">
                {config.items.length === 0 ?
                    <EmptyState
                        icon={HeartOff}
                        className="col-span-7"
                        message="No Media Highlighted Yet."
                    />
                    :
                    itemsToDisplay.map((item) =>
                        <MediaCard key={`${item.mediaType}-${item.mediaId}`} item={item} mediaType={item.mediaType}>
                            <div className="absolute bottom-0 w-full rounded-b-sm p-3 pb-2">
                                <h3 className="text-[10px] font-bold text-primary line-clamp-1" title={item.mediaName}>
                                    {item.mediaName}
                                </h3>
                            </div>
                        </MediaCard>
                    )
                }
            </div>
        </Card>
    );
};
