import * as z from "zod";
import {parse} from "csv-parse/sync";
import {ParsedImport, ParsedImportItem} from "@/lib/types/imports.types";
import {ApiProviderType, ImportItemStatus, MediaType,} from "@/lib/utils/enums";
import {gamesMyListsCSVRowSchema} from "@/lib/server/domain/media/games/games.types";
import {moviesMyListsCSVRowSchema} from "@/lib/server/domain/media/movies/movies.types";


export const MYLISTS_CSV_VERSION = "1";

export const MYLISTS_CSV_MAX_ROWS = 3000;


const parseCsvRecords = (csv: string) => {
    try {
        return parse(csv, {
            bom: true,
            skip_empty_lines: true,
            relax_column_count: false,
        });
    }
    catch (error) {
        throw new Error("The CSV structure is invalid", { cause: error });
    }
};


const mediaRowValidatorMap = {
    [MediaType.SERIES]: moviesMyListsCSVRowSchema,
    [MediaType.ANIME]: moviesMyListsCSVRowSchema,
    [MediaType.MOVIES]: moviesMyListsCSVRowSchema,
    [MediaType.GAMES]: gamesMyListsCSVRowSchema,
    [MediaType.BOOKS]: moviesMyListsCSVRowSchema,
    [MediaType.MANGA]: moviesMyListsCSVRowSchema,
} satisfies Record<MediaType, z.ZodTypeAny>;


const parseApiProvider = (value: string | undefined) => {
    const provider = Object.values(ApiProviderType).find((apiProvider) => apiProvider === value?.trim());
    return provider === ApiProviderType.USERS ? null : provider ?? null;
};


export const parseMyListsCsv = (csv: string): ParsedImport => {
    const records = parseCsvRecords(csv);
    if (records.length === 0) {
        throw new Error("The CSV file is empty");
    }

    const [headers, ...rows] = records;

    if (rows.length === 0) {
        throw new Error("The CSV file contains no rows");
    }

    if (rows.length > MYLISTS_CSV_MAX_ROWS) {
        throw new Error(`The CSV file contains too many rows. Maximum is ${MYLISTS_CSV_MAX_ROWS}.`);
    }

    // Check mediaType using first row
    const rawRow = Object.fromEntries(headers.map((header, cellIdx) => [header, rows[0][cellIdx] ?? ""]));
    const result = z.enum(MediaType).safeParse(rawRow.mediaType);
    if (!result.success) throw new Error("The CSV file does not contain a valid media type");
    const mediaZodValidator = mediaRowValidatorMap[result.data];

    const items = rows.map((cells, idx) => {
        const rowNumber = idx + 2;
        const rawRow = Object.fromEntries(headers.map((header, cellIdx) => [header, cells[cellIdx] ?? ""]));
        const parsedRow = mediaZodValidator.safeParse(rawRow);

        if (!parsedRow.success) {
            return {
                rowNumber,
                payload: rawRow,
                status: ImportItemStatus.FAILED,
                name: rawRow.mediaName?.trim() || null,
                releaseDate: rawRow.releaseDate?.trim() || null,
                externalApiId: rawRow.externalApiId?.trim() || null,
                externalApiSource: parseApiProvider(rawRow.externalApiSource),
                mediaType: Object.values(MediaType).find(mt => mt === rawRow.mediaType?.trim()) ?? null,
                statusReason: parsedRow.error.issues.map(i => `${i.path.join(".") || "row"}: ${i.message}`).join("; "),
            } satisfies ParsedImportItem;
        }

        const row = parsedRow.data;
        const { mediaName, mediaType, releaseDate, externalApiId, externalApiSource, formatVersion: _formatVersion, ...payload } = row;

        return {
            rowNumber,
            mediaType,
            releaseDate,
            externalApiId,
            name: mediaName,
            externalApiSource,
            statusReason: null,
            status: ImportItemStatus.QUEUED,
            payload: Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)),
        } satisfies ParsedImportItem;
    });

    return {
        items,
        totalCount: items.length,
        failedCount: items.filter(item => item.status === ImportItemStatus.FAILED).length,
    };
};
