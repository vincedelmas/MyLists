import * as z from "zod";
import {createInsertSchema} from "drizzle-zod";
import {MediaType, Status} from "@/lib/utils/enums";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {anime, animeList, series, seriesList} from "@/lib/server/database/schema";
import {animeAchievements} from "@/lib/server/domain/media/tv/anime/achievements.seed";
import {seriesAchievements} from "@/lib/server/domain/media/tv/series/achievements.seed";


export type Series = typeof series.$inferSelect;
export type Anime = typeof anime.$inferSelect;

export type SeriesList = typeof seriesList.$inferSelect;
export type AnimeList = typeof animeList.$inferSelect;

export type TvType = Series | Anime;
export type TvList = SeriesList | AnimeList;
export type TvImportPayload = z.infer<typeof tvImportPayloadSchema>;
export type TvFinalListInsert = z.infer<typeof tvFinalListInsertSchema>;
export type TvMediaType = typeof MediaType.SERIES | typeof MediaType.ANIME;

export type TvAchCodeName = typeof animeAchievements[number]["codeName"] | typeof seriesAchievements[number]["codeName"];


export type UpsertTvWithDetails = {
    mediaData: typeof series.$inferInsert | typeof anime.$inferInsert,
    actorsData?: { name: string }[],
    networkData?: { name: string }[],
    genresData?: { name: string }[] | null,
    seasonsData?: { season: number, episodes: number }[],
};


const emptyStringToNull = (value: unknown) => value === "" ? null : value;

const emptyStringToUndefined = (value: unknown) => value === "" ? undefined : value;

const parseBoolean = (value: unknown) => {
    if (value === "") return null;
    if (typeof value !== "string") return value;

    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true" || normalizedValue === "1") return true;
    if (normalizedValue === "false" || normalizedValue === "0") return false;

    return value;
};

const parseRedo2 = (value: unknown) => {
    if (value === "") return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value;

    const trimmedValue = value.trim();
    if (!trimmedValue) return undefined;

    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
        try {
            return JSON.parse(trimmedValue);
        }
        catch {
            return value;
        }
    }

    return trimmedValue.split(",").map((part) => Number(part.trim()));
};

const tvListSchemaOverrides = {
    status: z.enum(Status),
    favorite: z.preprocess(parseBoolean, z.boolean().nullable().optional()),
    comment: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    addedAt: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    redo: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    lastUpdated: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    total: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    rating: z.preprocess(emptyStringToNull, z.coerce.number().nullable().optional()),
    currentSeason: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    currentEpisode: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    redo2: z.preprocess(parseRedo2, z.array(z.coerce.number().int().min(0)).optional()),
};


const seriesCSVListSchema = createInsertSchema(seriesList, tvListSchemaOverrides);

const animeCSVListSchema = createInsertSchema(animeList, tvListSchemaOverrides);

const seriesFinalListInsertSchema = createInsertSchema(seriesList, {
    status: z.enum(Status),
    customCover: z.string().nullable().optional(),
    redo2: z.array(z.number().int().min(0)),
});

const animeFinalListInsertSchema = createInsertSchema(animeList, {
    status: z.enum(Status),
    customCover: z.string().nullable().optional(),
    redo2: z.array(z.number().int().min(0)),
});

const seriesImportPayloadSchema = seriesCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    customCover: true,
});

const animeImportPayloadSchema = animeCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    customCover: true,
});


export const tvImportPayloadSchema = z.union([seriesImportPayloadSchema, animeImportPayloadSchema]);

export const tvFinalListInsertSchema = z.union([seriesFinalListInsertSchema, animeFinalListInsertSchema]);

export const seriesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(seriesImportPayloadSchema.shape);

export const animeMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(animeImportPayloadSchema.shape);
