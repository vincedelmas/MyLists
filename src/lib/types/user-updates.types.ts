import {MediaType, UpdateType} from "@/lib/utils/enums";


export type LogPayload = { oldValue: any; newValue: any } | null;

export type LogUpdateParams = {
    media: any;
    userId: number;
    timestamp?: string;
    mediaType: MediaType;
    updateType: UpdateType;
    payload: { old_value: any; new_value: any };
};
