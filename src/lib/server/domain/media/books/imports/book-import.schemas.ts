import * as z from "zod";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {MediaType} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {bookStatuses} from "@/lib/server/domain/media/books/book-statuses";
import {importRedoSchema, importStatusSchema, importTotalSchema, nullableImportProgressSchema,} from "@/lib/server/domain/imports/import-list-validation";
import {importedCommonShape, storedCommonShape} from "@/lib/server/domain/imports/import-schema.shared";


export const booksImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.BOOKS, bookStatuses),
    actualPage: nullableImportProgressSchema,
    redo: importRedoSchema,
    total: importTotalSchema,
});

export const booksFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.BOOKS, bookStatuses),
    actualPage: z.number().int().min(0).nullable(),
    redo: z.number().int().min(0).max(REDO_MAX),
    total: z.number().int().min(0),
});

export const booksMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(booksImportPayloadSchema.shape);

export type BooksImportPayload = z.infer<typeof booksImportPayloadSchema>;
export type BooksFinalListInsert = z.infer<typeof booksFinalListInsertSchema>;
