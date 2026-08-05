import {HeartOff, TrendingUp} from "lucide-react";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";


interface HighlightedMediaProps {
    showMediaType?: boolean;
    config: ResolvedHighlightedMediaTabConfig;
}


export const HighlightedMedia = ({ config, showMediaType = false }: HighlightedMediaProps) => {
    const isBelowLg = useBreakpoint("lg");
    const itemsToDisplay = config.items.slice(0, isBelowLg ? 4 : 7);

    if (config.mode === "disabled") return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm text-foreground font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-brand"/>
                    {config.title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-2 max-lg:grid-cols-4">
                    {config.items.length === 0 ?
                        <EmptyState
                            icon={HeartOff}
                            className="col-span-7"
                            message="No Media Highlighted Yet."
                        />
                        :
                        itemsToDisplay.map((item) =>
                            <MediaCard item={item} mediaType={item.mediaType}>
                                <MediaCardFooter>
                                    <MediaCardTitle title={item.mediaName}>
                                        {item.mediaName}
                                    </MediaCardTitle>
                                    <MediaCardMeta>
                                        <MediaCardDetails>
                                            {showMediaType &&
                                                <MediaTypeIcon
                                                    mediaType={item.mediaType}
                                                />
                                            }
                                            <MediaReleaseDate
                                                precision="year"
                                                date={item.releaseDate}
                                            />
                                        </MediaCardDetails>
                                    </MediaCardMeta>
                                </MediaCardFooter>
                            </MediaCard>
                        )
                    }
                </div>
            </CardContent>
        </Card>
    );
};
