import React from "react";
import {Link} from "@tanstack/react-router";
import {zeroPad} from "@/lib/utils/number-formatting";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {KindDetailsProps} from "@/lib/client/components/media/family-component.types";
import {MediaExtraGrid, MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";


export const TvExtraSections = ({ mediaType, media }: KindDetailsProps<TvMediaType>) => {
    const cleanedActors = (media.actors ?? []).filter((a) => a.name !== null);

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
            {media.seasons.length > 0 &&
                <section>
                    <MediaSectionTitle title="Season Breakdown">
                        {media.totalEpisodes} Episodes
                    </MediaSectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 overflow-y-auto scrollbar-thin max-h-68">
                        {media.seasons.map((season) =>
                            <MediaExtraGrid
                                key={`season-${season.seasonNumber}`}
                                name={`Season ${season.seasonNumber}`}
                                initials={`S${zeroPad(season.seasonNumber)}`}
                                subname={`${season.episodeCount} Episodes`}
                            />
                        )}
                    </div>
                </section>
            }
        </>
    );
};
