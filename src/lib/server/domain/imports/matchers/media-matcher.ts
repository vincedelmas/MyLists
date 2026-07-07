import {ImportItemOutcome, ImportMatcherItem} from "@/lib/types/imports.types";


interface MediaMatcherContext {
    jobId: number;
    userId: number;
}


export interface MediaMatcher {
    match(context: MediaMatcherContext, items: ImportMatcherItem[]): AsyncIterable<ImportItemOutcome[]>;
}
