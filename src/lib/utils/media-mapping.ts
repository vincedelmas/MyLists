import {ApiProviderType, MediaType, Status} from "@/lib/utils/enums";
import {tvStatuses} from "@/lib/server/domain/media/tv/tv-statuses";
import {movieStatuses} from "@/lib/server/domain/media/movies/movie-statuses";
import {gameStatuses} from "@/lib/server/domain/media/games/game-statuses";
import {bookStatuses} from "@/lib/server/domain/media/books/book-statuses";
import {mangaStatuses} from "@/lib/server/domain/media/manga/manga-statuses";


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
    byMediaType: (mediaType: MediaType) => statusesByMediaType[mediaType],
};


const statusesByMediaType: Record<MediaType, Status[]> = {
    [MediaType.SERIES]: tvStatuses,
    [MediaType.ANIME]: tvStatuses,
    [MediaType.MOVIES]: movieStatuses,
    [MediaType.GAMES]: gameStatuses,
    [MediaType.BOOKS]: bookStatuses,
    [MediaType.MANGA]: mangaStatuses,
};


export const getRedoList = () => {
    return [...Array(11).keys()];
};


export const toItemKey = (item: { mediaId: number; mediaType: string }) => {
    return `${item.mediaType}-${item.mediaId}`;
};
