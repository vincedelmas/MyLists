import {GamesPlatformsEnum, Status, UpdateType} from "@/lib/utils/enums";


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

type PlaytimePayload = {
    playtime: number,
}

type StatusPayload = {
    status: Status,
}

type PagePayload = {
    actualPage: number,
}

type ChapterPayload = {
    currentChapter: number,
}

type RedoPayload = {
    redo: number,
}

type RedoTvPayload = {
    redo2: number[],
}

type EpsSeasonPayload = {
    currentSeason?: number,
    currentEpisode?: number,
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
