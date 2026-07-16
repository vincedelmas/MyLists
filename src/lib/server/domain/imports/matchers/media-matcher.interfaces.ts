import {ExternalResolverResult, ImportItemOutcome, ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";


export interface MediaMatcherContext {
    jobId: number;
    userId: number;
}


export interface MediaMatcher {
    match(context: MediaMatcherContext, items: ImportItemsSelect[]): AsyncIterable<ImportItemOutcome[]>;
}


export interface ImportListWriter {
    addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]>
}


export interface InternalMediaMatcher {
    match(items: ImportItemsSelect[]): Promise<{ matched: MatchedImportItem[], unresolved: ImportItemsSelect[] }>;
}


export interface InternalCatalogMatcherSource {
    findByApiIds(apiIds: (number | string)[]): Promise<{ id: number; apiId: number | string }[]>;
    findByNames(names: string[]): Promise<{ id: number; name: string; releaseDate: string | null }[]>;
}


export interface ExternalMediaMatcher {
    match(items: ImportItemsSelect[]): AsyncIterable<ExternalResolverResult>;
}
