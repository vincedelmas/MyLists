import * as z from "zod";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {MediaType} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {movieStatuses} from "@/lib/server/domain/media/movies/movie-statuses";
import {importRedoSchema, importStatusSchema, importTotalSchema} from "@/lib/server/domain/imports/import-list-validation";
import {importedCommonShape, storedCommonShape} from "@/lib/server/domain/imports/import-schema.shared";


export const moviesImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.MOVIES, movieStatuses),
    redo: importRedoSchema,
    total: importTotalSchema,
});

export const moviesFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.MOVIES, movieStatuses),
    redo: z.number().int().min(0).max(REDO_MAX),
    total: z.number().int().min(0),
});

export const moviesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(moviesImportPayloadSchema.shape);

export type MoviesImportPayload = z.infer<typeof moviesImportPayloadSchema>;
export type MovieFinalListInsert = z.infer<typeof moviesFinalListInsertSchema>;
