import * as z from "zod";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {MediaType, Status} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {tvStatuses} from "@/lib/server/domain/media/tv/tv-statuses";
import {importPositiveProgressSchema, importProgressSchema, importRedoSchema, importStatusSchema, importTotalSchema,} from "@/lib/server/domain/imports/import-list-validation";
import {importedCommonShape, importedRedoArraySchema, storedCommonShape,} from "@/lib/server/domain/imports/import-schema.shared";


const tvPayloadFor = (kind: TvMediaType) => z.object({
    ...importedCommonShape,
    status: importStatusSchema(kind, tvStatuses),
    currentSeason: importPositiveProgressSchema,
    currentEpisode: importProgressSchema,
    redo: importRedoSchema,
    redo2: importedRedoArraySchema,
    total: importTotalSchema,
});


const seriesImportPayloadSchema = tvPayloadFor(MediaType.SERIES);
const animeImportPayloadSchema = tvPayloadFor(MediaType.ANIME);

export const tvImportPayloadSchema = z.union([seriesImportPayloadSchema, animeImportPayloadSchema]);

export const tvFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: z.enum(Status),
    currentSeason: z.number().int().positive(),
    currentEpisode: z.number().int().min(0),
    redo: z.number().int().min(0).max(REDO_MAX),
    redo2: z.array(z.number().int().min(0).max(REDO_MAX)),
    total: z.number().int().min(0),
});

export const seriesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(seriesImportPayloadSchema.shape);
export const animeMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(animeImportPayloadSchema.shape);

export type TvImportPayload = z.infer<typeof tvImportPayloadSchema>;
export type TvFinalListInsert = z.infer<typeof tvFinalListInsertSchema>;
