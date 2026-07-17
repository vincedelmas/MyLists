import * as z from "zod";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {MediaType} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {mangaStatuses} from "@/lib/server/domain/media/manga/manga-statuses";
import {importProgressSchema, importRedoSchema, importStatusSchema, importTotalSchema,} from "@/lib/server/domain/imports/import-list-validation";
import {importedCommonShape, storedCommonShape} from "@/lib/server/domain/imports/import-schema.shared";


export const mangaImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.MANGA, mangaStatuses),
    currentChapter: importProgressSchema,
    redo: importRedoSchema,
    total: importTotalSchema,
});

export const mangaFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.MANGA, mangaStatuses),
    currentChapter: z.number().int().min(0),
    redo: z.number().int().min(0).max(REDO_MAX),
    total: z.number().int().min(0),
});

export const mangaMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(mangaImportPayloadSchema.shape);

export type MangaImportPayload = z.infer<typeof mangaImportPayloadSchema>;
export type MangaFinalListInsert = z.infer<typeof mangaFinalListInsertSchema>;
