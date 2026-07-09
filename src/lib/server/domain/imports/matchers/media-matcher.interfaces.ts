import {ImportItemOutcome, ImportItemsSelect, MatchedImportItem} from "@/lib/types/imports.types";


export interface MediaMatcherContext {
    jobId: number;
    userId: number;
}


export interface MediaMatcher {
    match(context: MediaMatcherContext, items: ImportItemsSelect[]): AsyncIterable<ImportItemOutcome[]>;
}


export interface InternalMediaMatcher {
    match(items: ImportItemsSelect[]): Promise<{ matched: MatchedImportItem[], unresolved: ImportItemsSelect[] }>;
}


export interface InternalMatcherPipeline {
    run(items: ImportItemsSelect[]): Promise<{ matched: MatchedImportItem[]; unresolved: ImportItemsSelect[] }>;
}
