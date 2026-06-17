import {DeltaStats} from "@/lib/types/stats.types";
import {ActivityKind, MediaType} from "@/lib/utils/enums";
import {UpdateUserMediaDetails} from "@/lib/types/user-media.types";


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


export type MonthlyActivityChartDatum = {
    month: string;
    total: number;
} & Partial<Record<MediaType, number>>;


export type LogActivityFromDelta = {
    userId: number;
    mediaId: number;
    delta: DeltaStats;
    lastUpdate?: string;
    mediaType: MediaType;
    newState: UpdateUserMediaDetails<any, any>["newState"];
};


export type LogActivity = {
    userId: number;
    mediaId: number;
    isRedo: boolean;
    hidden?: boolean;
    lastUpdate?: string;
    isCompleted: boolean;
    mediaType: MediaType;
    specificGained: number;
}
