import {z} from "zod";
import {parse} from "csv-parse/sync";
import {ParsedImport, ParsedImportItem} from "@/lib/types/imports.types";
import {ApiProviderType, GamesPlatformsEnum, ImportItemStatus, MediaType, Status,} from "@/lib/utils/enums";


export const MYLISTS_CSV_VERSION = "1";


export const MYLISTS_CSV_REQUIRED_HEADERS = [
    "name",
    "status",
    "media_type",
    "release_date",
    "format_version",
    "external_api_id",
    "external_api_source",
] as const;


export const MYLISTS_CSV_OPTIONAL_HEADERS = [
    "redo",
    "redo2",
    "total",
    "rating",
    "comment",
    "platform",
    "favorite",
    "added_at",
    "playtime",
    "actual_page",
    "last_updated",
    "current_season",
    "current_chapter",
    "current_episode",
] as const;


const supportedHeaders = new Set<string>([...MYLISTS_CSV_REQUIRED_HEADERS, ...MYLISTS_CSV_OPTIONAL_HEADERS]);


const supportedApiProviderSchema = z.enum([
    ApiProviderType.TMDB,
    ApiProviderType.BOOKS,
    ApiProviderType.IGDB,
    ApiProviderType.MANGA,
]);


const optionalStringSchema = z.string()
    .transform((value) => value.trim())
    .transform((value) => value || null);


const optionalNumberSchema = (integer = false) => z.string()
    .transform((value) => value.trim())
    .refine((value) => value === "" || (Number.isFinite(Number(value)) && (!integer || Number.isInteger(Number(value)))),
        integer ? "Must be an integer" : "Must be a number",
    )
    .transform((value) => value === "" ? null : Number(value));


const optionalBooleanSchema = z.string()
    .transform((value) => value.trim().toLowerCase())
    .refine((value) => ["", "true", "false", "1", "0"].includes(value), "Must be true, false, 1, or 0")
    .transform((value) => {
        if (value === "") return null;
        return value === "true" || value === "1";
    });


const optionalRedoHistorySchema = z.string()
    .transform((value) => value.trim())
    .transform((value, ctx): number[] | null => {
        if (!value) return null;

        try {
            const parsed: unknown = JSON.parse(value);
            if (!Array.isArray(parsed) || !parsed.every((entry) => Number.isInteger(entry))) {
                ctx.addIssue({ code: "custom", message: "Must be a JSON array of integers" });
                return z.NEVER;
            }
            return parsed;
        }
        catch {
            ctx.addIssue({ code: "custom", message: "Must be valid JSON" });
            return z.NEVER;
        }
    });


const optionalPlatformSchema = z.string()
    .transform((value) => value.trim())
    .pipe(z.union([z.literal(""), z.enum(GamesPlatformsEnum)]))
    .transform((value) => value || null);


const myListsRowSchema = z.object({
    status: z.enum(Status),
    name: optionalStringSchema,
    media_type: z.enum(MediaType),
    external_api_id: optionalStringSchema,
    rating: optionalNumberSchema().optional(),
    added_at: optionalStringSchema.optional(),
    favorite: optionalBooleanSchema.optional(),
    redo2: optionalRedoHistorySchema.optional(),
    platform: optionalPlatformSchema.optional(),
    last_updated: optionalStringSchema.optional(),
    format_version: z.literal(MYLISTS_CSV_VERSION),
    redo: optionalNumberSchema(true).optional(),
    total: optionalNumberSchema(true).optional(),
    playtime: optionalNumberSchema(true).optional(),
    actual_page: optionalNumberSchema(true).optional(),
    current_season: optionalNumberSchema(true).optional(),
    current_episode: optionalNumberSchema(true).optional(),
    current_chapter: optionalNumberSchema(true).optional(),
    comment: z.string().transform((value) => value || null).optional(),
    external_api_source: optionalStringSchema.pipe(supportedApiProviderSchema.nullable()),
    release_date: optionalStringSchema
        .refine((value) => value === null || checkReleaseDate(value), "Must use YYYY, YYYY-MM, or YYYY-MM-DD"),
}).superRefine((row, ctx) => {
    const hasExternalId = row.external_api_id !== null;
    const hasProvider = row.external_api_source !== null;

    if (hasProvider !== hasExternalId) {
        ctx.addIssue({
            code: "custom",
            path: ["external_api_id"],
            message: "External API source and ID must either both be set or both be empty",
        });
    }

    if (!row.name && !(hasProvider && hasExternalId)) {
        ctx.addIssue({
            code: "custom",
            path: ["name"],
            message: "Name is required when no external API identifier is provided",
        });
    }
});


type MyListsRow = z.output<typeof myListsRowSchema>;


export type ParsedMyListsItem = ParsedImportItem;


export class MyListsCsvFileError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "MyListsCsvFileError";
    }
}


export const parseMyListsCsv = (csv: string): ParsedImport => {
    const records = parseCsvRecords(csv);
    if (records.length === 0) {
        throw new MyListsCsvFileError("The CSV file is empty");
    }

    const [headers, ...rows] = records;
    validateHeaders(headers);

    if (rows.length === 0) {
        throw new MyListsCsvFileError("The CSV file contains no import rows");
    }

    const items = rows.map((cells, idx) => {
        const rowNumber = idx + 2;
        const rawRow = Object.fromEntries(headers.map((header, cellIdx) => [header, cells[cellIdx] ?? ""]));
        const parsedRow = myListsRowSchema.safeParse(rawRow);

        if (!parsedRow.success) {
            return {
                rowNumber,
                payload: rawRow,
                status: ImportItemStatus.FAILED,
                name: rawRow.name?.trim() || null,
                releaseDate: rawRow.release_date?.trim() || null,
                externalApiId: rawRow.external_api_id?.trim() || null,
                externalApiSource: parseApiProvider(rawRow.external_api_source),
                mediaType: Object.values(MediaType).find(mt => mt === rawRow.media_type?.trim()) ?? null,
                statusReason: parsedRow.error.issues.map(i => `${i.path.join(".") || "row"}: ${i.message}`).join("; "),
            } satisfies ParsedMyListsItem;
        }

        return mapValidRow(rowNumber, headers, parsedRow.data);
    });

    return {
        items,
        totalCount: items.length,
        failedCount: items.filter(item => item.status === ImportItemStatus.FAILED).length,
    };
};


const parseCsvRecords = (csv: string) => {
    try {
        return parse(csv, { bom: true, skip_empty_lines: true, relax_column_count: false });
    }
    catch (error) {
        throw new MyListsCsvFileError("The CSV structure is invalid", { cause: error });
    }
};


const validateHeaders = (headers: string[]) => {
    const duplicates = headers.filter((header, idx) => headers.indexOf(header) !== idx);
    if (duplicates.length > 0) {
        throw new MyListsCsvFileError(`Duplicate CSV headers: ${[...new Set(duplicates)].join(", ")}`);
    }

    const missing = MYLISTS_CSV_REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missing.length > 0) {
        throw new MyListsCsvFileError(`Missing required CSV headers: ${missing.join(", ")}`);
    }

    const unknown = headers.filter((header) => !supportedHeaders.has(header));
    if (unknown.length > 0) {
        throw new MyListsCsvFileError(`Unsupported CSV headers: ${unknown.join(", ")}`);
    }
};


const mapValidRow = (rowNumber: number, headers: string[], row: MyListsRow) => {
    const payload: Record<string, unknown> = { status: row.status };

    addPayloadField(payload, headers, "redo", row.redo);
    addPayloadField(payload, headers, "total", row.total);
    addPayloadField(payload, headers, "redo2", row.redo2);
    addPayloadField(payload, headers, "rating", row.rating);
    addPayloadField(payload, headers, "comment", row.comment);
    addPayloadField(payload, headers, "favorite", row.favorite);
    addPayloadField(payload, headers, "playtime", row.playtime);
    addPayloadField(payload, headers, "platform", row.platform);
    addPayloadField(payload, headers, "added_at", row.added_at, "addedAt");
    addPayloadField(payload, headers, "actual_page", row.actual_page, "actualPage");
    addPayloadField(payload, headers, "last_updated", row.last_updated, "lastUpdated");
    addPayloadField(payload, headers, "current_season", row.current_season, "currentSeason");
    addPayloadField(payload, headers, "current_episode", row.current_episode, "currentEpisode");
    addPayloadField(payload, headers, "current_chapter", row.current_chapter, "currentChapter");

    return {
        payload,
        rowNumber,
        name: row.name,
        statusReason: null,
        mediaType: row.media_type,
        releaseDate: row.release_date,
        status: ImportItemStatus.QUEUED,
        externalApiId: row.external_api_id,
        externalApiSource: row.external_api_source,
    };
};


const addPayloadField = (payload: Record<string, unknown>, headers: string[], header: string, value: unknown, payloadKey = header) => {
    if (headers.includes(header)) {
        payload[payloadKey] = value;
    }
};


const parseApiProvider = (value: string | undefined) => {
    const provider = Object.values(ApiProviderType).find((apiProvider) => apiProvider === value?.trim());
    return provider === ApiProviderType.USERS ? null : provider ?? null;
};


const checkReleaseDate = (value: string) => {
    const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
    if (!match) return false;

    const month = match[2] ? Number(match[2]) : null;
    const day = match[3] ? Number(match[3]) : null;
    if (month === null) return true;
    if (month < 1 || month > 12) return false;
    if (day === null) return true;

    const year = Number(match[1]);
    const daysPerMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    return day >= 1 && day <= daysPerMonth[month - 1];
};


const isLeapYear = (year: number) => {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
};
