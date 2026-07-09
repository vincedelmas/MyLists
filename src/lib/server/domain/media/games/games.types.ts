import * as z from "zod";
import {createInsertSchema} from "drizzle-zod";
import {GamesPlatformsEnum, Status} from "@/lib/utils/enums";
import {games, gamesList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {gamesAchievements} from "@/lib/server/domain/media/games/achievements.seed";


export type Game = typeof games.$inferSelect;


export type GamesList = typeof gamesList.$inferSelect;
export type GamesListInsert = typeof gamesList.$inferInsert;
export type GamesImportPayload = z.infer<typeof gamesImportPayloadSchema>;


export type GamesAchCodeName = typeof gamesAchievements[number]["codeName"];


export type UpsertGameWithDetails = {
    mediaData: typeof games.$inferInsert,
    genresData?: { name: string }[],
    platformsData?: { name: string }[],
    companiesData?: { name: string, developer: boolean, publisher: boolean }[],
};


const emptyStringToNull = (value: unknown) => value === "" ? null : value;

const emptyStringToUndefined = (value: unknown) => value === "" ? undefined : value;


const gamesCSVListSchema = createInsertSchema(gamesList, {
    status: z.enum(Status),
    comment: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    addedAt: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    lastUpdated: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    rating: z.preprocess(emptyStringToNull, z.coerce.number().nullable().optional()),
    playtime: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    platform: z.preprocess(emptyStringToNull, z.enum(GamesPlatformsEnum).nullable().optional()),
    favorite: z.preprocess((value) => {
        if (value === "") return null;
        if (typeof value !== "string") return value;

        const normalizedValue = value.trim().toLowerCase();
        if (normalizedValue === "true" || normalizedValue === "1") return true;
        if (normalizedValue === "false" || normalizedValue === "0") return false;

        return value;
    }, z.boolean().nullable().optional()),
});


export const gamesImportPayloadSchema = gamesCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    customCover: true,
});


export const gamesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(gamesImportPayloadSchema.shape);
