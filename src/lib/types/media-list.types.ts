import {MediaListArgs} from "@/lib/schemas";
import {NameObj} from "@/lib/types/media-common.types";
import {ListFiltersOptionsType} from "@/lib/types/query.options.types";
import {GamesPlatformsEnum, JobType, MediaType} from "@/lib/utils/enums";


export type ExpandedListFilters = {
    genres: NameObj[];
    tags: NameObj[];
    langs?: NameObj[];
    platforms?: { name: GamesPlatformsEnum }[];
};

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
