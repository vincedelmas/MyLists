import {importItems} from "@/lib/server/database/schema";
import {ApiProviderType, ImportItemStatus, ImportSource, MediaType} from "@/lib/utils/enums";


type ImportParser = (contents: string) => ParsedImport;
export type ImportParserRegistry = Partial<Record<ImportSource, ImportParser>>;
export type ImportMatcherItem = Omit<typeof importItems.$inferSelect, "mediaType"> & { mediaType: MediaType };


export interface ParsedImportItem {
    rowNumber: number;
    name: string | null;
    status: ImportItemStatus;
    releaseDate: string | null;
    statusReason: string | null;
    mediaType: MediaType | null;
    externalApiId: string | null;
    payload: Record<string, any>;
    externalApiSource: ApiProviderType | null;
}


export interface ParsedImport {
    totalCount: number;
    failedCount: number;
    items: ParsedImportItem[];
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


export interface ImportJobCounterDelta {
    failedCount: number;
    skippedCount: number;
    completedCount: number;
    processedCount: number;
}


export interface MatchedImportItem {
    mediaId: number;
    item: ImportMatcherItem;
}
