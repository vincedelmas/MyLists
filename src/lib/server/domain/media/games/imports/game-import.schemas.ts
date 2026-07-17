import * as z from "zod";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {GamesPlatformsEnum, MediaType} from "@/lib/utils/enums";
import {gameStatuses} from "@/lib/server/domain/media/games/game-statuses";
import {emptyStringToNull, importPlaytimeSchema, importStatusSchema,} from "@/lib/server/domain/imports/import-list-validation";
import {importedCommonShape, storedCommonShape} from "@/lib/server/domain/imports/import-schema.shared";


export const gamesImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.GAMES, gameStatuses),
    playtime: importPlaytimeSchema,
    platform: z.preprocess(emptyStringToNull, z.enum(GamesPlatformsEnum).nullable().optional()),
});

export const gamesFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.GAMES, gameStatuses),
    playtime: z.number().int().min(0),
    platform: z.enum(GamesPlatformsEnum).nullable().optional(),
});

export const gamesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(gamesImportPayloadSchema.shape);

export type GamesImportPayload = z.infer<typeof gamesImportPayloadSchema>;
export type GamesFinalListInsert = z.infer<typeof gamesFinalListInsertSchema>;
