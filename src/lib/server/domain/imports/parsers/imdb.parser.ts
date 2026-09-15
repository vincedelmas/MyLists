import * as z from "zod";
import {parse} from "csv-parse/sync";
import {MAX_IMPORT_ROWS} from "@/lib/utils/constants";
import type {ImportCsvType} from "@/lib/schemas/imports.schema";
import {ImportItemStatus, MediaType, Status} from "@/lib/utils/enums";
import {ParsedImport, ParsedImportItem} from "@/lib/types/imports.types";
import {emptyStringToNull} from "@/lib/server/domain/imports/import-list-validation";


const IMDB_FORMAT_ERROR = "Upload a current IMDb ratings or watchlist CSV export and select the matching file type.";

const movieTitleTypes = new Set(["movie", "tvmovie", "short", "tvshort", "tvspecial", "video"]);


const imdbRowSchema = z.object({
    Title: z.string().trim().min(1, "Movie title is required"),
    "Title Type": z.string().trim().min(1, "Title type is required"),
    Const: z.string().trim().regex(/^tt\d+$/, "IMDb title ID must start with tt followed by digits"),
    Year: z.string().trim().regex(/^([1-9]\d{3})?$/, "Release year must have four digits or be empty"),
    "Your Rating": z.preprocess(emptyStringToNull, z.coerce.number().int().min(1).max(10).nullable().optional()),
});


export const parseImdbCsv = (csv: string, fileType?: ImportCsvType): ParsedImport => {
    if (fileType !== "ratings" && fileType !== "watchlist") {
        throw new Error("Select IMDb ratings or watchlist before importing.");
    }

    let records: string[][];
    try {
        records = parse(csv, { bom: true, skip_empty_lines: true, relax_column_count: false });
    }
    catch (error) {
        throw new Error(`The CSV structure is invalid. ${IMDB_FORMAT_ERROR}`, { cause: error });
    }

    if (records.length === 0) throw new Error("The CSV file is empty");

    const [headers, ...rows] = records;

    const requiredHeaders = ["Const", "Title", "Year", "Title Type", ...(fileType === "ratings"
        ? ["Your Rating", "Date Rated"]
        : ["Position", "Created"])];

    if (new Set(headers).size !== headers.length || headers.some(header => !header.trim())
        || requiredHeaders.some(header => !headers.includes(header))
        || (fileType === "ratings" && headers.includes("Position"))) {
        throw new Error(IMDB_FORMAT_ERROR);
    }

    if (rows.length === 0) throw new Error("The CSV file contains no rows");
    if (rows.length > MAX_IMPORT_ROWS) {
        throw new Error(`The CSV file contains too many rows. Maximum is ${MAX_IMPORT_ROWS}.`);
    }

    const items = rows.map((cells, idx): ParsedImportItem => {
        const rawRow = Object.fromEntries(headers.map((header, cellIdx) => [header, cells[cellIdx]]));
        const titleType = rawRow["Title Type"].trim();

        const item = {
            rowNumber: idx + 2,
            externalApiId: null,
            externalApiSource: null,
            name: rawRow.Title.trim() || null,
            releaseDate: rawRow.Year.trim() || null,
        };

        if (titleType && !movieTitleTypes.has(titleType.toLowerCase().replaceAll(" ", ""))) {
            return {
                ...item,
                mediaType: null,
                payload: rawRow,
                status: ImportItemStatus.SKIPPED,
                statusReason: `IMDb title type "${titleType}" is not supported. Only movies can be imported.`,
            };
        }

        const parsedRow = imdbRowSchema.safeParse({
            ...rawRow,
            "Your Rating": fileType === "ratings" ? rawRow["Your Rating"] : undefined,
        });

        if (!parsedRow.success) {
            return {
                ...item,
                payload: rawRow,
                mediaType: MediaType.MOVIES,
                status: ImportItemStatus.FAILED,
                statusReason: parsedRow.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; "),
            };
        }

        const row = parsedRow.data;
        return {
            ...item,
            name: row.Title,
            statusReason: null,
            mediaType: MediaType.MOVIES,
            releaseDate: row.Year || null,
            status: ImportItemStatus.QUEUED,
            payload: {
                imdbId: row.Const,
                rating: row["Your Rating"] ?? null,
                status: fileType === "ratings" ? Status.COMPLETED : Status.PLAN_TO_WATCH,
            },
        };
    });

    return {
        items,
        totalCount: items.length,
        failedCount: items.filter(item => item.status === ImportItemStatus.FAILED).length,
    };
};
