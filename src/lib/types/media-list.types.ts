import {IdNamePair, NameObj} from "@/lib/types/media-common.types";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import type {MediaMetadataFilterKey} from "@/lib/media-definitions/definition.registry";


export type EpsPerSeasonType = { season: number, episodes: number };


export type MediaMetadataFilterOptions = Partial<Record<MediaMetadataFilterKey, NameObj[]>>;
export type ScopedMediaFilterOptions = Partial<Record<MediaType, MediaMetadataFilterOptions & { genres?: NameObj[]; tags?: NameObj[] }>>;


export type ExpandedListFilters = {
    genres: NameObj[];
    tags: NameObj[];
} & MediaMetadataFilterOptions;


export type MediaListData<TList> = {
    items: (TList & {
        pages?: number;
        common: boolean;
        mediaName: string;
        imageCover: string;
        tags: IdNamePair[];
        chapters?: number | null;
        ratingSystem: RatingSystemType;
        epsPerSeason?: EpsPerSeasonType[];
    })[];
    pagination: {
        page: number;
        perPage: number;
        sorting: string;
        totalPages: number;
        totalItems: number;
        availableSorting: string[];
    };
}


export type UserTag = {
    totalCount: number;
    tagId: number;
    tagName: string;
    medias: {
        mediaId: number;
        mediaName: string;
        mediaCover: string;
    }[];
}


export type ExportMediaList = {
    mediaName: string;
    externalApiId: string;
    releaseDate: string | null;
}
