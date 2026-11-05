import {TvMediaType, UpdateType} from "@/lib/utils/enums";
import {tvContinueDefinition} from "@/lib/media-definitions/tv/continue.definition";
import {formatContinueProgress} from "@/lib/client/components/continue/format-remaining";
import type {ContinueItemFor, ContinueProgress} from "@/lib/client/components/continue/continue.types";


export function getTvContinueProgress(item: ContinueItemFor<TvMediaType>): ContinueProgress {
    const seasons = [...item.epsPerSeason].sort((a, b) => a.season - b.season);
    const current = seasons.find(season => season.season === item.currentSeason)!;

    const update = tvContinueDefinition.getUpdate(item);
    const total = seasons.reduce((sum, season) => sum + season.episodes, 0);

    const value = seasons.filter(season => season.season < item.currentSeason)
        .reduce((sum, season) => sum + season.episodes, 0) + item.currentEpisode;

    const remaining = Math.max(0, total - value);

    return {
        value,
        label: formatContinueProgress(
            `${seasons.length > 1 ? `S${item.currentSeason} ` : ""}E${item.currentEpisode}/${current.episodes}`,
            remaining * item.duration,
        ),
        total,
        update: update ? { payload: update } : null,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 episode" : "Up to date",
    };
}
