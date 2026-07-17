import React, {useState} from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {ChevronDown, ChevronUp} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {useBreakpoint} from "@/lib/client/hooks/use-breakpoint";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";
import {SimilarMediaCard} from "@/lib/client/components/media/base/SimilarMedia";
import {MediaExtraGrid, MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";


export const MoviesExtraSections = ({ mediaType, media }: KindDetailsProps<typeof MediaType.MOVIES>) => {
    const INITIAL_COUNT = 5;
    const collection = media.collection ?? [];
    const isBelowSm = useBreakpoint("sm");
    const [isExpanded, setIsExpanded] = useState(false);
    const cleanedActors = (media.actors ?? []).filter((a) => a.name !== null);

    const visibleCollection = isBelowSm || isExpanded ? collection : collection.slice(0, INITIAL_COUNT);

    return (
        <>
            {cleanedActors.length > 0 &&
                <section>
                    <MediaSectionTitle title="Main Actors"/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {cleanedActors.map((actor) =>
                            <Link key={actor.name} to="/details/$mediaType/$job/$name" params={{ mediaType, job: "actor", name: actor.name }}>
                                <MediaExtraGrid
                                    subname="Actor"
                                    clickable={true}
                                    name={actor.name}
                                    initials={actor.name[0] + actor.name[1]}
                                />
                            </Link>
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
                                    mediaType={mediaType}
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
