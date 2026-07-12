import {MediaType} from "@/lib/utils/enums";
import {ProviderSearchResults, TrendsMedia} from "@/lib/types/provider.types";


type SearchCapability = {
    search(query: string, page?: number): Promise<ProviderSearchResults>;
};


type DetailsCapability<TDetails> = {
    getDetails(apiId: number | string): Promise<TDetails>;
    getDetailsBatch?: (apiIds: (number | string)[]) => Promise<Map<string, TDetails>>;
};


type TrendsCapability = {
    getTrends(): Promise<TrendsMedia[]>;
};


type ChangedIdsCapability = {
    getChangedIds(): Promise<(number | string)[]>;
};


type BulkRefreshResult = {
    reason: undefined;
    state: "fulfilled";
    apiId: number | string;
} | {
    reason: unknown;
    state: "rejected";
    apiId: number | string;
};


export type RefreshCandidateSource = {
    getCandidateApiIds(): Promise<(number | string)[]>;
};


export type IngestionContext = {
    isBulk?: boolean;
    mode: "store" | "refresh",
}


export type RefreshPolicy = {
    chunkSize?: number;
    shouldAbortBulkRefresh?: (reason: unknown) => boolean;
}


export type MediaDetailsEnricher<UpsertWithDetails> = {
    (details: UpsertWithDetails, context: IngestionContext): Promise<UpsertWithDetails>;
}


export interface ExternalMediaProvider<TDetails> {
    source: "tmdb" | "igdb" | "google-books" | "jikan";
    mediaType: MediaType;

    search: SearchCapability;
    details: DetailsCapability<TDetails>;

    trends?: TrendsCapability;
    changedIds?: ChangedIdsCapability;
}


export interface MediaIngestionService<_TDetails> {
    storeFromExternal(apiId: number | string, checkInternalFirst?: boolean): Promise<number>;

    storeBatchFromExternal(apiIds: (number | string)[], checkInternalFirst?: boolean): Promise<Map<string, number>>;

    refreshFromExternal(apiId: number | string, isBulk?: boolean): Promise<boolean>;

    bulkRefresh(limit?: number): AsyncGenerator<BulkRefreshResult, void, unknown>;
}
