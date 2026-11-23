import type {MediaType} from "@/lib/utils/enums";


type MediaRefreshRange = "30d" | "90d" | "1y" | "all";
type ApiMonitoringRange = "24h" | "7d" | "30d" | "90d" | "all";


export type AdminMediaRefreshStatsParams = {
    recentPage?: number;
    topRange?: MediaRefreshRange;
    dailyRange?: MediaRefreshRange;
};


export type AdminApiMonitoringParams = {
    recentPage?: number;
    range?: ApiMonitoringRange;
    dailyRange?: Exclude<ApiMonitoringRange, "24h">;
};


export type ProviderApiRollup = {
    total: number;
    errors: number;
    provider: string;
    bucketStartMs: number;
    maxSecondBurst: number;
    durationMsTotal: number;
    statusCounts: Record<string, number>;
};


export type AdminMissingCoverMedia = {
    name: string;
    mediaId: number;
    mediaType: MediaType;
    authors: string | null;
    releaseDate: string | null;
};


export type AdminBookMergeItem = {
    id: number;
    name: string;
    apiId: string;
    pages: number;
    usersCount: number;
    imageCover: string;
    authors: string | null;
    language: string | null;
    publishers: string | null;
    releaseDate: string | null;
};


export type AdminBookMergePreview = {
    movedActivities: number;
    mergedActivities: number;
    movedListEntries: number;
    movedCollectionItems: number;
    overlappingUsers: { id: number; name: string }[];
};


export type BookMergeSuggestionStatus = "pending" | "dismissed";
export type BookMergeSuggestionConfidence = "high" | "medium" | "low";


export type AdminBookMergeSuggestion = {
    id: number;
    reason: string;
    createdAt: string;
    targetBookId: number;
    books: AdminBookMergeItem[];
    confidence: BookMergeSuggestionConfidence;
};


export type AdminBookMergeReviewProgress = {
    totalBooks: number;
    reviewedBooks: number;
    unreviewedBooks: number;
    pendingSuggestions: number;
    dismissedSuggestions: number;
    unreviewedAuthorsWithMultipleBooks: number;
};


export type AdminBookMergeResult = {
    targetBookId: number;
    mergedBookCount: number;
    movedListEntries: number;
    duplicateListEntriesRemoved: number;
};
