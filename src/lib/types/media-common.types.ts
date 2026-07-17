import {MediaType} from "@/lib/utils/enums";


export type CoverType = `${MediaType}-covers` | "profile-covers" | "profile-back-covers";


export type SimpleMedia = {
    mediaId: number,
    mediaName: string,
    mediaCover: string,
}

export type Tag = { oldName?: string, name: string };

export type StatsCTE = any;
