import {ImportItemOutcome, ImportItemsSelect} from "@/lib/types/imports.types";


export interface MediaMatcherContext {
    jobId: number;
    userId: number;
}


export interface MediaMatcher {
    match(context: MediaMatcherContext, items: ImportItemsSelect[]): AsyncIterable<ImportItemOutcome[]>;
}
