import React, {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {capitalize} from "@/lib/utils/text-formatting";
import {SimpleMedia} from "@/lib/types/media-common.types";
import {ChevronDown, ChevronUp} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {MediaCard} from "@/lib/client/components/media/base/MediaCard";
import {MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";


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
                <div className="text-end -mt-1">
                    <Button variant="ghost" size="xs" onClick={handleToggle}>
                        {isExpanded
                            ? <>Show Less <ChevronUp className="size-3.5"/></>
                            : <>Show More <ChevronDown className="size-3.5"/></>
                        }
                    </Button>
                </div>
            }
        </section>
    );
};


export const SimilarMediaCard = ({ mediaType, item }: { mediaType: MediaType; item: SimpleMedia }) => {
    return (
        <MediaCard mediaType={mediaType} item={item}>
            <div className="absolute bottom-0 w-full rounded-b-sm p-3 pb-2">
                <div className="flex w-full items-center justify-between text-sm">
                    <h3 className="grow truncate font-semibold text-primary" title={item.mediaName}>
                        {item.mediaName}
                    </h3>
                </div>
            </div>
        </MediaCard>
    );
};
