import * as z from "zod";
import {createInsertSchema} from "drizzle-zod";
import {games, gamesList} from "@/lib/server/database/schema";
import {GamesPlatformsEnum, MediaType} from "@/lib/utils/enums";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {gamesAchievements} from "@/lib/server/domain/media/games/achievements.seed";
import {
    emptyStringToNull,
    importCommentSchema,
    importFavoriteSchema,
    importPlaytimeSchema,
    importRatingSchema,
    importStatusSchema
} from "@/lib/server/domain/imports/import-list-validation";


export type Game = typeof games.$inferSelect;
export type GamesList = typeof gamesList.$inferSelect;
export type GamesImportPayload = z.infer<typeof gamesImportPayloadSchema>;
export type GamesAchCodeName = typeof gamesAchievements[number]["codeName"];


export type UpsertGameWithDetails = {
    mediaData: typeof games.$inferInsert,
    genresData?: { name: string }[],
    platformsData?: { name: string }[],
    companiesData?: { name: string, developer: boolean, publisher: boolean }[],
};


export const gamesFinalListInsertSchema = createInsertSchema(gamesList, {
    status: importStatusSchema(MediaType.GAMES),
    customCover: z.string().nullable().optional(),
    platform: z.enum(GamesPlatformsEnum).nullable().optional(),
});


const gamesCSVListSchema = createInsertSchema(gamesList, {
    rating: importRatingSchema,
    comment: importCommentSchema,
    playtime: importPlaytimeSchema,
    favorite: importFavoriteSchema,
    status: importStatusSchema(MediaType.GAMES),
    platform: z.preprocess(emptyStringToNull, z.enum(GamesPlatformsEnum).nullable().optional()),
});


export const gamesImportPayloadSchema = gamesCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
});


export const gamesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(gamesImportPayloadSchema.shape);
