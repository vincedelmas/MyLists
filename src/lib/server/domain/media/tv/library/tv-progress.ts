import {Status} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {REDO_MAX} from "@/lib/utils/constants";


export type TvSeasonDefinition = {
    seasonNumber: number;
    episodeCount: number;
};

export type TvSeasonRewatchState = {
    seasonNumber: number;
    count: number;
};

export type TvProgressState = {
    status: Status;
    currentSeason: number;
    currentEpisode: number;
    watchedEpisodes: number;
    rewatches: TvSeasonRewatchState[];
};


const resetStatuses = new Set<Status>([Status.PLAN_TO_WATCH, Status.RANDOM]);


export const createInitialTvProgress = (
    status: Status,
    seasons: TvSeasonDefinition[],
): TvProgressState => {
    assertTvStatus(status);
    const orderedSeasons = normalizeSeasons(seasons);
    const firstSeason = orderedSeasons.at(0);
    const lastSeason = orderedSeasons.at(-1);

    if (!firstSeason || !lastSeason || resetStatuses.has(status)) {
        return {
            status,
            currentSeason: firstSeason?.seasonNumber ?? 1,
            currentEpisode: 0,
            watchedEpisodes: 0,
            rewatches: [],
        };
    }

    if (status === Status.COMPLETED) {
        return {
            status,
            currentSeason: lastSeason.seasonNumber,
            currentEpisode: lastSeason.episodeCount,
            watchedEpisodes: availableEpisodeCount(orderedSeasons),
            rewatches: [],
        };
    }

    const firstEpisode = firstSeason.episodeCount > 0 ? 1 : 0;
    return {
        status,
        currentSeason: firstSeason.seasonNumber,
        currentEpisode: firstEpisode,
        watchedEpisodes: firstEpisode,
        rewatches: [],
    };
};


export const changeTvStatus = (
    current: TvProgressState,
    status: Status,
    seasons: TvSeasonDefinition[],
): TvProgressState => {
    assertTvStatus(status);
    const orderedSeasons = normalizeSeasons(seasons);

    if (resetStatuses.has(status)) {
        const reset = createInitialTvProgress(status, orderedSeasons);
        return { ...reset, rewatches: [] };
    }

    if (status === Status.COMPLETED) {
        const position = positionFromWatchedEpisodes(availableEpisodeCount(orderedSeasons), orderedSeasons);
        return {
            ...current,
            status,
            ...position,
            watchedEpisodes: availableEpisodeCount(orderedSeasons),
        };
    }

    if (resetStatuses.has(current.status)) {
        const initial = createInitialTvProgress(status, orderedSeasons);
        return { ...initial, rewatches: current.rewatches };
    }

    return { ...current, status };
};


export const moveTvProgress = (
    current: TvProgressState,
    position: { seasonNumber: number; episodeNumber: number },
    seasons: TvSeasonDefinition[],
): TvProgressState => {
    const watchedEpisodes = watchedEpisodesFromPosition(position, seasons);
    return {
        ...current,
        currentSeason: position.seasonNumber,
        currentEpisode: position.episodeNumber,
        watchedEpisodes,
    };
};


export const moveTvProgressToSeason = (
    current: TvProgressState,
    seasonNumber: number,
    seasons: TvSeasonDefinition[],
) => moveTvProgress(current, { seasonNumber, episodeNumber: 1 }, seasons);


export const replaceTvRewatches = (
    current: TvProgressState,
    counts: TvSeasonRewatchState[],
    seasons: TvSeasonDefinition[],
): TvProgressState => {
    const seasonNumbers = new Set(normalizeSeasons(seasons).map(({ seasonNumber }) => seasonNumber));
    const seen = new Set<number>();
    const rewatches: TvSeasonRewatchState[] = [];

    for (const item of counts) {
        if (!seasonNumbers.has(item.seasonNumber)) {
            throw new FormattedError("Invalid season number");
        }
        if (seen.has(item.seasonNumber)) {
            throw new FormattedError("A season rewatch count was provided more than once.");
        }
        if (!Number.isInteger(item.count) || item.count < 0 || item.count > REDO_MAX) {
            throw new FormattedError(`A season cannot be re-watched more than ${REDO_MAX} times.`);
        }

        seen.add(item.seasonNumber);
        if (item.count > 0) rewatches.push(item);
    }

    return { ...current, rewatches: rewatches.sort((a, b) => a.seasonNumber - b.seasonNumber) };
};


/** Preserve absolute progress when provider season metadata changes. */
export const reconcileTvSeasons = (
    current: TvProgressState,
    seasons: TvSeasonDefinition[],
): TvProgressState => {
    const orderedSeasons = normalizeSeasons(seasons);
    const availableSeasons = new Set(orderedSeasons.map(({ seasonNumber }) => seasonNumber));
    const cappedWatched = Math.min(current.watchedEpisodes, availableEpisodeCount(orderedSeasons));

    return {
        ...current,
        ...positionFromWatchedEpisodes(cappedWatched, orderedSeasons),
        watchedEpisodes: cappedWatched,
        rewatches: current.rewatches.filter(({ seasonNumber }) => availableSeasons.has(seasonNumber)),
    };
};


const watchedEpisodesFromPosition = (
    position: { seasonNumber: number; episodeNumber: number },
    seasons: TvSeasonDefinition[],
) => {
    const orderedSeasons = normalizeSeasons(seasons);
    const seasonIndex = orderedSeasons.findIndex(({ seasonNumber }) => seasonNumber === position.seasonNumber);
    if (seasonIndex < 0) throw new FormattedError("Invalid season number");

    const selectedSeason = orderedSeasons[seasonIndex];
    if (!Number.isInteger(position.episodeNumber) || position.episodeNumber < 0 || position.episodeNumber > selectedSeason.episodeCount) {
        throw new FormattedError("Invalid episode");
    }

    return orderedSeasons
        .slice(0, seasonIndex)
        .reduce((total, season) => total + season.episodeCount, 0) + position.episodeNumber;
};


export const positionFromWatchedEpisodes = (
    watchedEpisodes: number,
    seasons: TvSeasonDefinition[],
): { currentSeason: number; currentEpisode: number } => {
    const orderedSeasons = normalizeSeasons(seasons);
    const firstSeason = orderedSeasons.at(0);
    if (!firstSeason) return { currentSeason: 1, currentEpisode: 0 };

    const totalAvailable = availableEpisodeCount(orderedSeasons);
    const cappedWatched = Math.max(0, Math.min(watchedEpisodes, totalAvailable));
    if (cappedWatched === 0) {
        return { currentSeason: firstSeason.seasonNumber, currentEpisode: 0 };
    }

    let accumulated = 0;
    for (const season of orderedSeasons) {
        if (cappedWatched <= accumulated + season.episodeCount) {
            return {
                currentSeason: season.seasonNumber,
                currentEpisode: cappedWatched - accumulated,
            };
        }
        accumulated += season.episodeCount;
    }

    const lastSeason = orderedSeasons.at(-1)!;
    return { currentSeason: lastSeason.seasonNumber, currentEpisode: lastSeason.episodeCount };
};


export const consumedEpisodeCount = (state: TvProgressState, seasons: TvSeasonDefinition[]) => {
    const episodesBySeason = new Map(normalizeSeasons(seasons).map((season) => [season.seasonNumber, season.episodeCount]));
    const rewatchedEpisodes = state.rewatches.reduce(
        (total, rewatch) => total + rewatch.count * (episodesBySeason.get(rewatch.seasonNumber) ?? 0),
        0,
    );
    return state.watchedEpisodes + rewatchedEpisodes;
};


export const totalTvRewatchCount = (state: TvProgressState) => state.rewatches.reduce((total, item) => total + item.count, 0);


const availableEpisodeCount = (seasons: TvSeasonDefinition[]) => seasons.reduce((total, season) => total + season.episodeCount, 0);


const normalizeSeasons = (seasons: TvSeasonDefinition[]) => {
    const ordered = [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
    const seen = new Set<number>();

    for (const season of ordered) {
        if (!Number.isInteger(season.seasonNumber) || season.seasonNumber <= 0 || seen.has(season.seasonNumber)) {
            throw new FormattedError("Invalid season number");
        }
        if (!Number.isInteger(season.episodeCount) || season.episodeCount < 0) {
            throw new FormattedError("Invalid episode count");
        }
        seen.add(season.seasonNumber);
    }

    return ordered;
};


const assertTvStatus = (status: Status) => {
    const allowed = new Set<Status>([
        Status.WATCHING,
        Status.COMPLETED,
        Status.ON_HOLD,
        Status.RANDOM,
        Status.DROPPED,
        Status.PLAN_TO_WATCH,
    ]);
    if (!allowed.has(status)) throw new FormattedError("Status is not valid for TV media.");
};
