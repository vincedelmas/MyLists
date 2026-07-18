import {ActivityKind, MediaType} from "@/lib/utils/enums";


export type MediaInfo = {
    id: number;
    name: string;
    duration?: number;
    imageCover: string;
    releaseDate: string;
    inUserList?: boolean;
    customCover: string | null;
}


export type ActivityEditor = {
    id: number;
    isRedo: boolean;
    mediaId: number;
    hidden: boolean;
    mediaName: string;
    mediaCover: string;
    lastUpdate: string;
    timeGained: number;
    isCompleted: boolean;
    mediaType: MediaType;
    specificGained: number;
}


export type PaginatedActivityFilter = {
    page?: number;
    perPage?: number;
    timeBucket: string;
    mediaType?: MediaType;
    hiddenOnly?: boolean;
    activityKind?: ActivityKind;
    mediaIdsByType?: Partial<Record<MediaType, number[]>>;
}


export type WrappedActivityResult = {
    count: number;
    timeGained: number;
    specificTotal: number;
}


export type ActivityMediaRef = {
    mediaId: number;
    mediaType: MediaType;
    specificGained: number;
};


export type ActivityMediaDuration = {
    id: number;
    duration: number | null;
};


export interface ActivityDurationSource {
    getByIds(mediaIds: number[]): Promise<ActivityMediaDuration[]>;
}


export type ActivityMediaDefinition = {
    longUnit?: string;
    inputStep: number;
    shortUnit?: string;
    toStoredValue: (value: number) => number;
    toDisplayValue: (value: number) => number;
    calculateTime: (specificGained: number, duration?: number) => number;
};


export type MonthlyActivityChartDatum = {
    month: string;
    total: number;
} & Partial<Record<MediaType, number>>;
