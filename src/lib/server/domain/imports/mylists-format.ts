import * as z from "zod";
import {ApiProviderType, MediaType} from "@/lib/utils/enums";


export const MYLISTS_CSV_VERSION = "2";


export type MyListsCSVImport = z.infer<typeof minimalMyListsCSVSchema>;


export const MYLISTS_FORMAT_ERROR = "This file does not use the current MyLists format. " +
    "Please re-export your list from Settings > Content & Lists and upload the new CSV file.";


export const minimalMyListsCSVSchema = z.object({
    formatVersion: z.string(),
    mediaType: z.enum(MediaType),
    releaseDate: z.string().nullable(),
    externalApiSource: z.enum(ApiProviderType),
    mediaName: z.string().trim().min(1, "Media name is required"),
    externalApiId: z.string().trim().min(1, "External media ID is required"),
});


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
