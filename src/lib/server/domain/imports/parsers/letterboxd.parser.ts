import * as z from "zod";
import {parse} from "csv-parse/sync";
import type {LetterboxdCsvType} from "@/lib/schemas/imports.schema";
import {ParsedImport, ParsedImportItem} from "@/lib/types/imports.types";
import {ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {emptyStringToNull} from "@/lib/server/domain/imports/import-list-validation";


const LETTERBOXD_CSV_MAX_ROWS = 3000;
const LETTERBOXD_FORMAT_ERROR = "Upload the original ratings.csv, watched.csv, or watchlist.csv from your Letterboxd export and select the matching file type.";

const letterboxdRowSchema = z.object({
    Name: z.string().trim().min(1, "Movie name is required"),
    Year: z.string().trim().regex(/^[1-9]\d{3}$/, "Release year must have four digits"),
    Rating: z.preprocess(emptyStringToNull,
        z.coerce.number().min(0.5).max(5).multipleOf(0.5).nullable().optional()),
});


export const parseLetterboxdCsv = (csv: string, fileType?: LetterboxdCsvType): ParsedImport => {
    if (!fileType) throw new Error("Select the Letterboxd CSV file type before importing.");

    let records: string[][];
    try {
        records = parse(csv, { bom: true, skip_empty_lines: true, relax_column_count: false });
    }
    catch (error) {
        throw new Error(`The CSV structure is invalid. ${LETTERBOXD_FORMAT_ERROR}`, { cause: error });
    }

    if (records.length === 0) throw new Error("The CSV file is empty");

    const [headers, ...rows] = records;
    const expectedHeaders = ["Date", "Name", "Year", "Letterboxd URI", ...(fileType === "ratings" ? ["Rating"] : [])];
    if (new Set(headers).size !== headers.length || headers.length !== expectedHeaders.length
        || expectedHeaders.some(header => !headers.includes(header))) {
        throw new Error(LETTERBOXD_FORMAT_ERROR);
    }

    if (rows.length === 0) throw new Error("The CSV file contains no rows");
    if (rows.length > LETTERBOXD_CSV_MAX_ROWS) {
        throw new Error(`The CSV file contains too many rows. Maximum is ${LETTERBOXD_CSV_MAX_ROWS}.`);
    }

    const items = rows.map((cells, idx): ParsedImportItem => {
        const rawRow = Object.fromEntries(headers.map((header, cellIdx) => [header, cells[cellIdx]]));
        const parsedRow = letterboxdRowSchema.safeParse(rawRow);
        const item = {
            rowNumber: idx + 2,
            mediaType: MediaType.MOVIES,
            externalApiId: null,
            externalApiSource: null,
        };

        if (!parsedRow.success) {
            return {
                ...item,
                payload: rawRow,
                name: rawRow.Name.trim() || null,
                releaseDate: rawRow.Year.trim() || null,
                status: ImportItemStatus.FAILED,
                statusReason: parsedRow.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; "),
            };
        }

        const row = parsedRow.data;
        return {
            ...item,
            name: row.Name,
            releaseDate: row.Year,
            status: ImportItemStatus.QUEUED,
            statusReason: null,
            payload: {
                status: fileType === "watchlist" ? Status.PLAN_TO_WATCH : Status.COMPLETED,
                rating: row.Rating == null ? null : row.Rating * 2,
            },
        };
    });

    return {
        items,
        totalCount: items.length,
        failedCount: items.filter(item => item.status === ImportItemStatus.FAILED).length,
    };
};
