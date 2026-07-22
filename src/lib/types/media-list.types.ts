import {MediaListArgs} from "@/lib/schemas";
import {IdNamePair, NameObj} from "@/lib/types/media-common.types";
import {ListFiltersOptionsType} from "@/lib/types/query.options.types";
import {GamesPlatformsEnum, JobType, MediaType, RatingSystemType} from "@/lib/utils/enums";


export type EpsPerSeasonType = { season: number, episodes: number };


export type ExpandedListFilters = {
    genres: NameObj[];
    tags: NameObj[];
    langs?: NameObj[];
    platforms?: { name: GamesPlatformsEnum }[];
};


export type MediaListData<TList> = {
    items: (TList & {
        pages?: number;
        common: boolean;
        mediaName: string;
        chapters?: number;
        imageCover: string;
        tags: IdNamePair[];
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


export type SheetFilterObject = {
    job?: JobType;
    title: string;
    key: keyof MediaListArgs;
    type: "checkbox" | "search";
    render?: (name: string, mediaType: MediaType) => string;
    getItems?: (data: ListFiltersOptionsType) => { name: string }[] | undefined;
};


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
