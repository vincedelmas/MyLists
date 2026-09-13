import * as z from "zod";
import {ImportSource} from "@/lib/utils/enums";
import {coercedPositiveIntFieldSchema, paginationSchema} from "@/lib/schemas/common.schema";


export type LetterboxdCsvType = z.infer<typeof letterboxdCsvTypeSchema>;
export type ImportUploadFormValues = z.input<typeof importUploadSchema>;
export type ImportCsvType = LetterboxdCsvType | z.infer<typeof imdbCsvTypeSchema>;


const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;


const acceptedCsvMimeTypes = new Set([
    "",
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.ms-excel",
]);


export const imdbCsvTypeSchema = z.enum(["ratings", "watchlist"]);

export const letterboxdCsvTypeSchema = z.enum(["ratings", "watched", "watchlist"]);


const importFileSchema = z.object({
    file: z.instanceof(File)
        .refine((file) => file.size > 0, "The CSV file is empty.")
        .refine((file) => file.size <= MAX_IMPORT_FILE_SIZE, `The CSV file must be ${MAX_IMPORT_FILE_SIZE / 1048576}MB or smaller.`)
        .refine((file) => file.name.toLowerCase().endsWith(".csv"), "The import file must use the .csv extension.")
        .refine((file) => acceptedCsvMimeTypes.has(file.type.toLowerCase()), "The import file must be a CSV file."),
});


export const importUploadSchema = z.discriminatedUnion("source", [
    importFileSchema.extend({ source: z.literal(ImportSource.MYLISTS) }),
    importFileSchema.extend({
        source: z.literal(ImportSource.LETTERBOXD),
        letterboxdFileType: letterboxdCsvTypeSchema,
    }),
    importFileSchema.extend({
        imdbFileType: imdbCsvTypeSchema,
        source: z.literal(ImportSource.IMDB),
    }),
]);


export const importJobIdSchema = z.object({
    jobId: coercedPositiveIntFieldSchema,
});


export const importJobIssuesSchema = paginationSchema.extend({
    jobId: coercedPositiveIntFieldSchema,
});


export const importSearchSchema = paginationSchema.extend({
    jobId: coercedPositiveIntFieldSchema.optional(),
});
