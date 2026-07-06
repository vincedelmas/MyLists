import {MediaType} from "@/lib/utils/enums";
import {importItems} from "@/lib/server/database/schema";
import {ImportItemOutcome} from "@/lib/types/imports.types";


export type ImportMatcherItem = Omit<typeof importItems.$inferSelect, "mediaType"> & { mediaType: MediaType };


export interface MediaMatcherContext {
    jobId: number;
    userId: number;
}


export interface MediaMatcher {
    match(context: MediaMatcherContext, items: ImportMatcherItem[]): AsyncIterable<ImportItemOutcome[]>;
}
