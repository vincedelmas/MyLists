import {TvMediaType, UpdateType} from "@/lib/utils/enums";
import {tvContinueDefinition} from "@/lib/media-definitions/tv/tv.definition";
import {formatContinueProgress, type ContinueItemFor, type ContinueProgress} from "@/lib/client/components/continue/continue.utils";


export function getTvContinueProgress(item: ContinueItemFor<TvMediaType>): ContinueProgress {
    const seasons = item.epsPerSeason;
    const current = seasons.find(season => season.season === item.currentSeason)!;

    const update = tvContinueDefinition.getUpdate(item);
    const total = seasons.reduce((sum, season) => sum + season.episodes, 0);

    const value = seasons.filter(season => season.season < item.currentSeason)
        .reduce((sum, season) => sum + season.episodes, 0) + item.currentEpisode;

    const remaining = Math.max(0, total - value);

    return {
        value,
        total,
        update: update ? { payload: update } : null,
        actionLabel: update?.type === UpdateType.STATUS ? "Mark completed" : update ? "+ 1 episode" : "Up to date",
        label: formatContinueProgress(
            `${seasons.length > 1 ? `S${item.currentSeason} ` : ""}E${item.currentEpisode}/${current.episodes}`,
            remaining * item.duration,
        ),
    };
}
