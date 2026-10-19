import {NameObj} from "@/lib/types/media-common.types";
import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import type {MediaMetadataFilterKey} from "@/lib/media-definitions/definition.registry";


export type EpsPerSeasonType = { season: number, episodes: number };
export type MediaMetadataFilterOptions = Partial<Record<MediaMetadataFilterKey, NameObj[]>>;
export type ExpandedListFilters = { tags: NameObj[]; genres: NameObj[] } & MediaMetadataFilterOptions;


export type ScopedMediaFilterOptions<TagOption extends NameObj = NameObj> = Partial<Record<MediaType, MediaMetadataFilterOptions
    & { genres?: NameObj[]; tags?: TagOption[] }>>;


export type MediaFilterSearchSource =
    | { type: "tracking"; username: string }
    | { type: "collection"; collectionId: number; library?: "in" | "out" };


export type MediaListData<TList> = {
    items: (Pick<TList, Extract<
        "mediaId" | "userId" | "status" | "rating" | "favorite" | "comment" | "customCover" |
        "redo" | "playtime" | "actualPage" | "currentChapter" |
        "currentSeason" | "currentEpisode" | "pages" | "chapters", keyof TList
    >> & {
        pages?: number;
        common: boolean;
        mediaName: string;
        imageCover: string;
        chapters?: number | null;
        ratingSystem: RatingSystemType;
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
    tagName: string;
};


export type ExportMediaList = {
    mediaName: string;
    externalApiId: string;
    releaseDate: string | null;
}
