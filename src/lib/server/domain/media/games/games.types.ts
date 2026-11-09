import * as z from "zod";
import {createInsertSchema} from "drizzle-zod";
import {emptyStringToNull} from "@/lib/utils/formatting/text";
import {games, gamesList} from "@/lib/server/database/schema";
import {GamesPlatformsEnum, MediaType} from "@/lib/utils/enums";
import {mediaStatusSchema} from "@/lib/schemas/media-status.schema";
import {minimalMyListsCSVSchema} from "@/lib/server/domain/imports/mylists-format";
import {
    importCommentSchema,
    importExternalNumericIdSchema,
    importFavoriteSchema,
    importPlaytimeSchema,
    importRatingSchema
} from "@/lib/server/domain/imports/import-list-validation";


export type Game = typeof games.$inferSelect;
export type GamesList = typeof gamesList.$inferSelect;


export type UpsertGameWithDetails = {
    mediaData: typeof games.$inferInsert,
    genresData?: { name: string }[],
    platformsData?: { name: string }[],
    companiesData?: { name: string, developer: boolean, publisher: boolean }[],
};

export type UpdateGameWithDetails = Omit<UpsertGameWithDetails, "mediaData"> & {
    mediaData: Partial<UpsertGameWithDetails["mediaData"]> & Pick<UpsertGameWithDetails["mediaData"], "apiId">;
};


export const gamesFinalListInsertSchema = createInsertSchema(gamesList, {
    status: mediaStatusSchema(MediaType.GAMES),
    customCover: z.string().nullable().optional(),
    platform: z.enum(GamesPlatformsEnum).nullable().optional(),
});


const gamesCSVListSchema = createInsertSchema(gamesList, {
    rating: importRatingSchema,
    comment: importCommentSchema,
    playtime: importPlaytimeSchema,
    favorite: importFavoriteSchema,
    status: mediaStatusSchema(MediaType.GAMES),
    platform: z.preprocess(emptyStringToNull, z.enum(GamesPlatformsEnum).nullable().optional()),
});


export const gamesImportPayloadSchema = gamesCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
    releaseNotificationsEnabled: true,
});


export const gamesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend({
    ...gamesImportPayloadSchema.shape,
    externalApiId: importExternalNumericIdSchema,
});
