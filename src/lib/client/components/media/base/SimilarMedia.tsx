import React, {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {ChevronDown, ChevronUp} from "lucide-react";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {SimpleMedia} from "@/lib/types/media-common.types";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {MediaReleaseDate} from "@/lib/client/components/media/base/MediaReleaseDate";
import {MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";
import {MediaCard, MediaCardFooter, MediaCardMeta, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";


export const SimilarMedia = ({ mediaType, similarMedia }: { mediaType: MediaType; similarMedia: SimpleMedia[] }) => {
    const INITIAL_COUNT = 5;
    const isBelowSm = useBreakpoint("sm")
    const [itemsToShow, setItemsToShow] = useState(INITIAL_COUNT);

    const isExpanded = itemsToShow >= similarMedia.length;
    const visibleMedia = isBelowSm ? similarMedia : similarMedia.slice(0, itemsToShow);

    const handleToggle = () => {
        if (isExpanded) setItemsToShow(INITIAL_COUNT);
        else setItemsToShow((prev) => Math.min(prev + 5, similarMedia.length));
    };

    return (
        <section>
            <MediaSectionTitle title={`Similar ${capitalize(mediaType)}`}/>
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-4 scrollbar-thin sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible">
                {visibleMedia.map((item) =>
                    <div key={item.mediaId} className="w-32 flex-none sm:w-full">
                        <SimilarMediaCard
                            item={item}
                            mediaType={mediaType}
                        />
                    </div>
                )}
            </div>

            {!isBelowSm && similarMedia.length > INITIAL_COUNT &&
                <div className="text-end -mt-2">
                    <Button variant="hover" size="sm" onClick={handleToggle}>
                        {isExpanded
                            ? <>Show Less <ChevronUp/></>
                            : <>Show More <ChevronDown/></>
                        }
                    </Button>
                </div>
            }
        </section>
    );
};


export const SimilarMediaCard = ({ mediaType, item }: { mediaType: MediaType; item: SimpleMedia }) => {
    return (
        <MediaCard item={item} mediaType={mediaType}>
            <MediaCardFooter density="compact">
                <MediaCardTitle density="compact" title={item.mediaName}>
                    {item.mediaName}
                </MediaCardTitle>
                <MediaCardMeta>
                    <MediaReleaseDate date={item.releaseDate}/>
                </MediaCardMeta>
            </MediaCardFooter>
        </MediaCard>
    );
};
