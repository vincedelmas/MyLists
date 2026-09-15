import {AdvancedSearchFilters} from "@/lib/schemas";
import {GameAdvancedSearchOptions, ProviderSearchResults, TrendsMedia} from "@/lib/types/provider.types";


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
    search(query: string, page?: number, advancedFilters?: AdvancedSearchFilters): Promise<ProviderSearchResults>;

    getDetails(apiId: number | string): Promise<TDetails>;

    getTrends?(): Promise<TrendsMedia[]>;

    getChangedIds?(): Promise<(number | string)[]>;

    getAdvancedOptions?(): Promise<GameAdvancedSearchOptions>;

    getDetailsBatch?(apiIds: (number | string)[]): Promise<Map<string, TDetails>>;
}
