import {TvMediaType, UpdateType} from "@/lib/utils/enums";
import {tvContinueDefinition} from "@/lib/media-definitions/tv/continue.definition";
import type {ContinueItemFor, ContinueProgress} from "@/lib/client/components/continue/continue.types";


export function getTvContinueProgress(item: ContinueItemFor<TvMediaType>): ContinueProgress {
    const seasons = [...item.epsPerSeason].sort((a, b) => a.season - b.season);
    const current = seasons.find(season => season.season === item.currentSeason)!;

    const update = tvContinueDefinition.getUpdate(item);
    const total = seasons.reduce((sum, season) => sum + season.episodes, 0);

    const value = seasons.filter(season => season.season < item.currentSeason)
        .reduce((sum, season) => sum + season.episodes, 0) + item.currentEpisode;

    return {
        value,
        total,
        label: `S${item.currentSeason}/S${seasons.at(-1)!.season} · Eps. ${item.currentEpisode}/${current.episodes}`,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 episode" : "Up to date",
        update: update ? { payload: update } : null,
    };
}
