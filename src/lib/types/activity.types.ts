import {ActivityKind, MediaType, UpdateType} from "@/lib/utils/enums";
import {DeltaStats} from "@/lib/types/stats.types";


export type MediaInfo = {
    id: number;
    name: string;
    duration?: number;
    imageCover: string;
    releaseDate: string;
    inUserList?: boolean;
    customCover: string | null;
}


export type MonthlyActivityEditor = {
    id: number;
    mediaId: number;
    hidden: boolean;
    mediaName: string;
    mediaCover: string;
    timeGained: number;
    redoGained: number;
    mediaType: MediaType;
    hadCompletion: boolean;
    lastActivityAt: string;
    progressGained: number;
}


export type PaginatedMonthlyActivityFilter = {
    page?: number;
    perPage?: number;
    timeBucket: string;
    hiddenOnly?: boolean;
    mediaType?: MediaType;
    activityKind?: ActivityKind;
    mediaIdsByType?: Partial<Record<MediaType, number[]>>;
}


export type WrappedMonthlyActivityResult = {
    count: number;
    timeGained: number;
    progressTotal: number;
}


export type MonthlyActivityMediaRef = {
    mediaId: number;
    mediaType: MediaType;
    progressGained: number;
};


export type MonthlyActivityChartDatum = {
    month: string;
    total: number;
} & Partial<Record<MediaType, number>>;


export type LogMonthlyActivityFromDelta = {
    userId: number;
    mediaId: number;
    delta: DeltaStats;
    mediaType: MediaType;
    activityDate?: string;
    updateType: UpdateType;
};


export type LogMonthlyActivity = {
    userId: number;
    mediaId: number;
    hidden?: boolean;
    redoGained: number;
    mediaType: MediaType;
    activityDate?: string;
    hadCompletion: boolean;
    progressGained: number;
}
