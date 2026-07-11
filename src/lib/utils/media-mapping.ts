import {ApiProviderType, MediaType, Status} from "@/lib/utils/enums";


export const mediaTypeToApiProvider = (mediaType: MediaType) => {
    switch (mediaType) {
        case MediaType.MOVIES:
        case MediaType.SERIES:
        case MediaType.ANIME:
            return ApiProviderType.TMDB;
        case MediaType.GAMES:
            return ApiProviderType.IGDB;
        case MediaType.BOOKS:
            return ApiProviderType.BOOKS;
        case MediaType.MANGA:
            return ApiProviderType.MANGA;
    }
};


export const statusUtils = {
    getNoPlanTo: (): Status[] => [Status.PLAN_TO_WATCH, Status.PLAN_TO_PLAY, Status.PLAN_TO_READ],
    byMediaType: (mediaType: MediaType) => {
        switch (mediaType) {
            case MediaType.SERIES:
            case MediaType.ANIME:
                return [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLAN_TO_WATCH];
            case MediaType.MOVIES:
                return [Status.COMPLETED, Status.PLAN_TO_WATCH];
            case MediaType.GAMES:
                return [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_PLAY];
            case MediaType.BOOKS:
                return [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ];
            case MediaType.MANGA:
                return [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ];
        }
    },
};


export const mediaTypeUtils = {
    getTypesForNotifications: (): MediaType[] => [MediaType.SERIES, MediaType.ANIME, MediaType.MOVIES],
    getComingNextTypes: (): MediaType[] => [MediaType.SERIES, MediaType.ANIME, MediaType.MOVIES, MediaType.GAMES],
};


export const getRedoList = () => {
    return [...Array(11).keys()];
};


export const toItemKey = (item: { mediaId: number; mediaType: string }) => {
    return `${item.mediaType}-${item.mediaId}`;
};
