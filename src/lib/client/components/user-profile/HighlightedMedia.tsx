import {HeartOff, TrendingUp} from "lucide-react";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {EmptyState} from "@/lib/client/components/general/EmptyState";
import {ResolvedHighlightedMediaTabConfig} from "@/lib/types/profile-custom.types";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaCard, MediaCardDetails, MediaCardFooter, MediaCardMeta, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


interface HighlightedMediaProps {
    showMediaType?: boolean;
    config: ResolvedHighlightedMediaTabConfig;
}


export const HighlightedMedia = ({ config, showMediaType = false }: HighlightedMediaProps) => {
    const isBelowLg = useBreakpoint("lg");
    const isSmallScreen = useBreakpoint("sm");
    const itemsToDisplay = config.items.slice(0, isBelowLg && !isSmallScreen ? 4 : 7);

    if (config.mode === "disabled") return null;

    return (
        <section aria-label={config.title} className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="size-4 text-brand"/>
                    {config.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                    A selection of media from this library
                </p>
            </div>
            {config.items.length === 0 ?
                <EmptyState
                    icon={HeartOff}
                    message="No Media Highlighted Yet."
                />
                :
                <div className="grid grid-cols-7 gap-2 max-lg:grid-cols-4 max-sm:grid-flow-col max-sm:grid-cols-none max-sm:auto-cols-[calc((100%-1.5rem)*0.375)] max-sm:overflow-x-auto max-sm:pb-2 scrollbar-thin">
                    {itemsToDisplay.map((item) =>
                        <MediaCard key={`${item.mediaType}-${item.mediaId}`} item={item} mediaType={item.mediaType}>
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
                    )}
                </div>
            }
        </section>
    );
};
