import {Status, TvMediaType, UpdateType} from "@/lib/utils/enums";
import type {ContinueDefinition} from "@/lib/media-definitions/base/continue.definition";


export const tvContinueDefinition: ContinueDefinition<TvMediaType> = {
    status: Status.WATCHING,
    getUpdate: (state) => {
        const seasons = [...state.epsPerSeason].sort((a, b) => a.season - b.season);
        const current = seasons.find(season => season.season === state.currentSeason)!;

        if (state.currentEpisode < current.episodes) {
            return { type: UpdateType.TV, currentEpisode: state.currentEpisode + 1 };
        }

        const nextSeason = seasons.find(season => season.season > state.currentSeason && season.episodes > 0);
        if (nextSeason) {
            return { type: UpdateType.TV, currentSeason: nextSeason.season, currentEpisode: 1 };
        }

        return state.currentSeason === seasons.at(-1)!.season
            && state.currentEpisode === current.episodes && current.episodes > 0
            ? { type: UpdateType.STATUS, status: Status.COMPLETED }
            : null;
    },
};
