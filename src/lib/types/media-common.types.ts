import {MediaType} from "@/lib/utils/enums";
import {EpsPerSeasonType} from "@/lib/types/media-list.types";


export type CoverType = `${MediaType}-covers` | "profile-covers" | "profile-back-covers";

export type IdNamePair = { id: number, name: string };

export type NameObj = { name: string };

export type AddedMediaDetails = {
    genres: IdNamePair[];
    actors?: IdNamePair[];
    authors?: IdNamePair[];
    networks?: IdNamePair[];
    platforms?: IdNamePair[];
    epsPerSeason?: EpsPerSeasonType[];
    providerData: {
        url: string,
        name: string,
    };
    collection?: {
        mediaId: number,
        mediaName: string,
        mediaCover: string,
        releaseDate: string | null,
    }[];
    companies?: {
        id: number,
        name: string,
        developer: boolean,
        publisher: boolean,
    }[];
};

export type SimpleMedia = {
    mediaId: number,
    mediaName: string,
    mediaCover: string,
    releaseDate: string | null,
}

export type Tag = { oldName?: string, name: string };

export type StatsCTE = any;
