import {ExternalResolverResult, ImportItemOutcome, ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";


export interface ImportListWriter {
    addMatchedItems(userId: number, matches: MatchedImportItem[]): Promise<ImportItemOutcome[]>
}


export interface InternalMediaMatcher {
    match(items: ImportItemsSelect[]): Promise<{ matched: MatchedImportItem[], unresolved: ImportItemsSelect[] }>;
}


export interface ExternalMediaMatcher {
    match(items: ImportItemsSelect[]): AsyncIterable<ExternalResolverResult>;
}
