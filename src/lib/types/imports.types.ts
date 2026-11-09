import {importItems} from "@/lib/server/database/schema";
import type {ImportCsvType} from "@/lib/schemas/imports.schema";
import {ImportItemStatus, ImportSource, MediaType} from "@/lib/utils/enums";


type ImportParser = (contents: string, fileType?: ImportCsvType) => ParsedImport;

export type ParsedImportItem = Omit<typeof importItems.$inferInsert, "jobId">;
export type ImportParserRegistry = Partial<Record<ImportSource, ImportParser>>;
export type ImportItemsSelect = Omit<typeof importItems.$inferSelect, "mediaType"> & { mediaType: MediaType };


export interface ParsedImport {
    totalCount: number;
    failedCount: number;
    items: ParsedImportItem[];
}


export interface ImportJobCounterDelta {
    failedCount: number;
    skippedCount: number;
    completedCount: number;
    processedCount: number;
}


export interface MatchedImportItem {
    mediaId: number;
    item: ImportItemsSelect;
}


export interface ExternalResolverResult {
    failed: ImportItemOutcome[];
    matched: MatchedImportItem[];
    skipped: ImportItemOutcome[];
    unresolved: ImportItemsSelect[];
}


export type ImportItemOutcome = {
    itemId: number;
    matchedMediaId: number;
    statusReason?: string | null;
    status: typeof ImportItemStatus.COMPLETED;
} | {
    itemId: number;
    statusReason: string;
    matchedMediaId?: null;
    status: typeof ImportItemStatus.SKIPPED | typeof ImportItemStatus.FAILED;
};
