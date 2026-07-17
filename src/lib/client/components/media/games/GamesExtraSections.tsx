import React, {useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {ChevronDown, ChevronUp} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";
import {SimilarMediaCard} from "@/lib/client/components/media/base/SimilarMedia";
import {MediaExtraGrid, MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";


export const GamesExtraSections = ({ media }: KindDetailsProps<typeof MediaType.GAMES>) => {
    const INITIAL_COUNT = 5;
    const collection = media.collection ?? [];
    const isBelowSm = useBreakpoint("sm");
    const [isExpanded, setIsExpanded] = useState(false);
    const cleanedPlatforms = (media.platforms ?? []).filter((a) => a.name !== null);
    const sortedPlatforms = cleanedPlatforms.sort((a, b) => a.name.localeCompare(b.name));
    const visibleCollection = isBelowSm || isExpanded ? collection : collection.slice(0, INITIAL_COUNT);

    return (
        <>
            {sortedPlatforms.length > 0 &&
                <section>
                    <MediaSectionTitle title="Game Platforms"/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-50 scrollbar-thin">
                        {sortedPlatforms.map((plat) =>
                            <MediaExtraGrid
                                key={plat.name}
                                name={plat.name}
                                subname="Platform"
                                initials={plat.name[0] + plat.name[1]}
                            />
                        )}
                    </div>
                </section>
            }
            {collection.length > 0 &&
                <section>
                    <MediaSectionTitle title="In The Same Series"/>
                    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-4 scrollbar-thin sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible">
                        {visibleCollection.map((item) =>
                            <div key={item.mediaId} className="w-32 flex-none sm:w-full">
                                <SimilarMediaCard
                                    item={item}
                                    mediaType={MediaType.GAMES}
                                />
                            </div>
                        )}
                    </div>

                    {!isBelowSm && collection.length > INITIAL_COUNT &&
                        <Button variant="ghost" size="xs" onClick={() => setIsExpanded((prev) => !prev)}>
                            {isExpanded
                                ? <>Show Less <ChevronUp className="size-3.5"/></>
                                : <>Show More <ChevronDown className="size-3.5"/></>
                            }
                        </Button>
                    }
                </section>
            }
        </>
    );
};
