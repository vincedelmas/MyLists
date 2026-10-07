import type {MediaType} from "@/lib/utils/enums";


export type CollectionItemInput = {
    mediaId: number;
    mediaType: MediaType;
    annotation?: string | null;
};


export type DraftItem = {
    mediaId: number;
    mediaName: string;
    mediaCover: string;
    mediaType: MediaType;
    annotation?: string | null;
};
