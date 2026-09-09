import type {TvSeasonDetails, TvSeasonState} from "@/lib/schemas/tv-seasons.schema";


export const getTvSeasonTotals = (seasons: TvSeasonDetails[]) => {
    let redo = 0;
    let ratingSum = 0;
    let redoEpisodes = 0;
    let ratedSeasons = 0;

    for (const season of seasons) {
        if (season.episodes === null) continue;

        redo += season.redo;
        redoEpisodes += season.redo * season.episodes;

        if (season.rating !== null) {
            ratedSeasons += 1;
            ratingSum += season.rating;
        }
    }

    return {
        redo,
        redoEpisodes,
        rating: ratedSeasons ? Math.round(ratingSum / ratedSeasons * 10) / 10 : null,
    };
};


export const attachTvSeasonEpisodes = (states: TvSeasonState[], metadata: { season: number; episodes: number }[]): TvSeasonDetails[] => {
    const episodes = new Map(metadata.map(s => [s.season, s.episodes]));

    return states.map(s => ({ ...s, episodes: episodes.get(s.season) ?? null }));
};


export const getTvSeasonPosition = (progress: number, seasons: { season: number; episodes: number }[]) => {
    const totalEpsAvailable = seasons.reduce((sum, season) => sum + season.episodes, 0);

    if (totalEpsAvailable === 0 || seasons.length === 0) {
        return { season: 1, episode: 0 };
    }

    if (progress >= totalEpsAvailable) {
        return { season: seasons.at(-1)!.season, episode: seasons.at(-1)!.episodes };
    }

    let accumulated = 0;
    for (const season of seasons) {
        if (accumulated + season.episodes >= progress) {
            return { season: season.season, episode: Math.max(0, progress - accumulated) };
        }
        accumulated += season.episodes;
    }

    return { season: 1, episode: 0 };
};
