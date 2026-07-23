import React from "react";
import {Link} from "@tanstack/react-router";
import {MediaType} from "@/lib/utils/enums";
import {zeroPad} from "@/lib/utils/number-formatting";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {MediaConfig} from "@/lib/client/components/media/media-config";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaExtraGrid, MediaSectionTitle} from "@/lib/client/components/media/base/MediaDetailsComps";


type TvDetailsProps<T extends MediaType> = Parameters<NonNullable<MediaConfig[T]["extraSections"]>>[number];


export const TvExtraSections = ({ mediaType, media }: TvDetailsProps<TvMediaType>) => {
    const episodeUnit = getMediaDefinition(mediaType).progress.unit!;
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
            {(media.epsPerSeason && media.epsPerSeason.length > 0) &&
                <section>
                    <MediaSectionTitle title="Season Breakdown">
                        {media.totalEpisodes} {episodeUnit.long}
                    </MediaSectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 overflow-y-auto scrollbar-thin max-h-68">
                        {media.epsPerSeason.map((s) =>
                            <MediaExtraGrid
                                key={`season-${s.season}`}
                                name={`Season ${s.season}`}
                                initials={`S${zeroPad(s.season)}`}
                                subname={`${s.episodes} ${episodeUnit.long}`}
                            />
                        )}
                    </div>
                </section>
            }
        </>
    );
};
