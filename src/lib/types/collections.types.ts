import {PrivacyType} from "@/lib/utils/enums";


export type CollectionItemInput = {
    mediaId: number;
    annotation?: string | null;
};


export type AssertCollection = {
    ownerId: number;
    privacy: PrivacyType;
    ownerPrivacy: PrivacyType;
};


export type DraftItem = {
    mediaId: number;
    mediaName: string;
    mediaCover: string;
    annotation?: string | null;
};
