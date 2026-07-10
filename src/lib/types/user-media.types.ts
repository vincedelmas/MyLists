import {DeltaStats} from "@/lib/types/stats.types";
import {NameObj} from "@/lib/types/media-common.types";
import {LogPayload} from "@/lib/types/user-updates.types";
import {GamesPlatformsEnum, RatingSystemType, Status, UpdateType} from "@/lib/utils/enums";


export type UpdatePayload = {
    payload: {
        type: UpdateType;
        loggedAt?: string;
    } & (CommentPayload | PlatformPayload | RatingPayload | FavoritePayload |
        PlaytimePayload | StatusPayload | PagePayload | ChapterPayload | RedoPayload |
        RedoTvPayload | EpsSeasonPayload);
}

type CommentPayload = {
    comment: string | null | undefined,
}

type PlatformPayload = {
    platform: GamesPlatformsEnum | null,
}

type RatingPayload = {
    rating: number | null,
}

type FavoritePayload = {
    favorite: boolean,
}

export type PlaytimePayload = {
    playtime: number,
}

export type StatusPayload = {
    status: Status,
}

export type PagePayload = {
    actualPage: number,
}

export type ChapterPayload = {
    currentChapter: number,
}

export type RedoPayload = {
    redo: number,
}

export type RedoTvPayload = {
    redo2: number[],
}

export type EpsSeasonPayload = {
    currentSeason?: number,
    currentEpisode?: number,
}

export type UserMediaStats = {
    userId: number;
    timeSpent: number;
    totalRedo: number;
    totalEntries: number;
    entriesRated: number;
    totalSpecific: number;
    averageRating: number;
    sumEntriesRated: number;
    entriesFavorites: number;
    entriesCommented: number;
    statusCounts: Record<Status, number>;
};

export type UserMediaWithTags<TList> = TList & {
    tags: NameObj[],
    ratingSystem: RatingSystemType,
};

export type UserFollowsMediaData<TList> = {
    id: number;
    name: string;
    userMedia: TList;
    image: string | null;
    ratingSystem: RatingSystemType;
}

export type MediaCommunityActivityStats = {
    total: number;
    totalRedo: number;
    likedCount: number;
    totalSpecific: number;
    totalPlaytime: number;
    completedCount: number;
    averageRating: number | null;
}

export type UpdateUserMediaDetails<TMedia, TList> = {
    media: TMedia;
    newState: TList;
    delta: DeltaStats;
    logPayload: LogPayload;
}

export type UpdateHandlerFn<TState, TPayload, TMedia> =
    (currentState: TState, payload: TPayload, media: TMedia) => [TState, LogPayload] | Promise<[TState, LogPayload]>;
