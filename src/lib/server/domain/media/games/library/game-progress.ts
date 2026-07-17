import {FormattedError} from "@/lib/utils/error-classes";
import {GamesPlatformsEnum, Status} from "@/lib/utils/enums";


const GAME_PLAYTIME_MAX_MINUTES = 30_000 * 60;


export type GameStatus =
    | typeof Status.PLAYING
    | typeof Status.COMPLETED
    | typeof Status.MULTIPLAYER
    | typeof Status.ENDLESS
    | typeof Status.ON_HOLD
    | typeof Status.DROPPED
    | typeof Status.PLAN_TO_PLAY;


export type GameProgressState = {
    status: GameStatus;
    playtimeMinutes: number;
    platform: GamesPlatformsEnum | null;
};


const gameStatuses = new Set<Status>([
    Status.PLAYING,
    Status.COMPLETED,
    Status.MULTIPLAYER,
    Status.ENDLESS,
    Status.ON_HOLD,
    Status.DROPPED,
    Status.PLAN_TO_PLAY,
]);


const gamePlatforms = new Set<GamesPlatformsEnum>(Object.values(GamesPlatformsEnum));


export const isGameStatus = (status: Status): status is GameStatus => gameStatuses.has(status);


export const createInitialGameProgress = (status: Status): GameProgressState => ({
    status: requireGameStatus(status),
    playtimeMinutes: 0,
    platform: null,
});


export const importGameProgress = (
    status: Status,
    playtimeMinutes: number,
    platform: GamesPlatformsEnum | null,
): GameProgressState => ({
    status: requireGameStatus(status),
    playtimeMinutes: requirePlaytime(playtimeMinutes),
    platform: requirePlatform(platform),
});


export const changeGameStatus = (current: GameProgressState, status: Status): GameProgressState => {
    const nextStatus = requireGameStatus(status);
    return {
        ...current,
        status: nextStatus,
        playtimeMinutes: nextStatus === Status.PLAN_TO_PLAY ? 0 : current.playtimeMinutes,
    };
};


export const replaceGamePlaytime = (current: GameProgressState, playtimeMinutes: number): GameProgressState => ({
    ...current,
    playtimeMinutes: requirePlaytime(playtimeMinutes),
});


export const replaceGamePlatform = (
    current: GameProgressState,
    platform: GamesPlatformsEnum | null,
): GameProgressState => ({ ...current, platform: requirePlatform(platform) });


const requireGameStatus = (status: Status): GameStatus => {
    if (!isGameStatus(status)) throw new FormattedError("Status is not valid for games.");
    return status;
};


const requirePlaytime = (playtimeMinutes: number) => {
    if (!Number.isInteger(playtimeMinutes) || playtimeMinutes < 0 || playtimeMinutes > GAME_PLAYTIME_MAX_MINUTES) {
        throw new FormattedError("Playtime must be between 0 and 30,000 hours.");
    }
    return playtimeMinutes;
};


const requirePlatform = (platform: GamesPlatformsEnum | null) => {
    if (platform !== null && !gamePlatforms.has(platform)) throw new FormattedError("Platform is not valid for games.");
    return platform;
};
