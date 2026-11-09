import type {MyListsCSVImport} from "@/lib/types/imports.types";
import type {ApiProviderType, MediaType} from "@/lib/utils/enums";


export const MYLISTS_CSV_VERSION = "2";


export const MYLISTS_FORMAT_ERROR = "This file does not use the current MyLists format. " +
    "Please re-export your list from Settings > Content & Lists and upload the new CSV file.";


type ExportRow = Pick<MyListsCSVImport, "mediaName" | "externalApiId" | "releaseDate"> & {
    addedAt?: string | null;
    lastUpdated?: string | null;
    releaseNotificationsEnabled?: boolean;
};


export const formatMyListsCsvExport = <TRow extends ExportRow>(rows: TRow[], mediaType: MediaType, externalApiSource: ApiProviderType) => {
    return rows.map(({ addedAt: _addedAt, lastUpdated: _lastUpdated, releaseNotificationsEnabled: _notifications, ...row }) => ({
        ...row,
        mediaType,
        externalApiSource,
        formatVersion: MYLISTS_CSV_VERSION,
    } satisfies MyListsCSVImport));
};
