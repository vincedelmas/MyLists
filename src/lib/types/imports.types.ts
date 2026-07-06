import {ApiProviderType, ImportItemStatus, ImportSource, MediaType} from "@/lib/utils/enums";


type ImportParser = (contents: string) => ParsedImport;
export type ImportParserRegistry = Partial<Record<ImportSource, ImportParser>>;


export interface ParsedImportItem {
    rowNumber: number;
    name: string | null;
    status: ImportItemStatus;
    releaseDate: string | null;
    statusReason: string | null;
    mediaType: MediaType | null;
    externalApiId: string | null;
    payload: Record<string, unknown>;
    externalApiSource: ApiProviderType | null;
}


export interface ParsedImport {
    totalCount: number;
    failedCount: number;
    items: ParsedImportItem[];
}
