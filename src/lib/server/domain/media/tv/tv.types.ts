import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {anime, animeList, series, seriesList} from "@/lib/server/database/schema";
import {animeAchievements} from "@/lib/server/domain/media/tv/anime/achievements.seed";
import {seriesAchievements} from "@/lib/server/domain/media/tv/series/achievements.seed";
import {
    importCommentSchema,
    importFavoriteSchema,
    importPositiveProgressSchema,
    importProgressSchema,
    importRatingSchema,
    importRedoSchema,
    importStatusSchema,
    importTotalSchema
} from "@/lib/server/domain/imports/import-list-validation";
import {REDO_MAX} from "@/lib/utils/constants";


type Series = typeof series.$inferSelect;
type Anime = typeof anime.$inferSelect;

type SeriesList = typeof seriesList.$inferSelect;
type AnimeList = typeof animeList.$inferSelect;

export type TvType = Series | Anime;
export type TvList = SeriesList | AnimeList;
export type TvImportPayload = z.infer<typeof tvImportPayloadSchema>;
export type TvMediaType = typeof MediaType.SERIES | typeof MediaType.ANIME;
export type TvAchCodeName = typeof animeAchievements[number]["codeName"] | typeof seriesAchievements[number]["codeName"];


export type UpsertTvWithDetails = {
    mediaData: typeof series.$inferInsert | typeof anime.$inferInsert,
    actorsData?: { name: string }[],
    networkData?: { name: string }[],
    genresData?: { name: string }[] | null,
    seasonsData?: { season: number, episodes: number }[],
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

    const parts = trimmedValue.split(",").map((part) => part.trim());
    if (parts.some((part) => part === "")) return value;

    return parts.map((part) => Number(part));
};

const tvListSchemaOverrides = (mediaType: TvMediaType) => ({
    redo: importRedoSchema,
    total: importTotalSchema,
    rating: importRatingSchema,
    comment: importCommentSchema,
    favorite: importFavoriteSchema,
    currentEpisode: importProgressSchema,
    status: importStatusSchema(mediaType),
    currentSeason: importPositiveProgressSchema,
    redo2: z.preprocess(parseRedo2, z.array(z.coerce.number().int().min(0).max(REDO_MAX)).optional()),
});


const seriesCSVListSchema = createInsertSchema(seriesList, tvListSchemaOverrides(MediaType.SERIES));

const animeCSVListSchema = createInsertSchema(animeList, tvListSchemaOverrides(MediaType.ANIME));

const seriesFinalListInsertSchema = createInsertSchema(seriesList, {
    status: importStatusSchema(MediaType.SERIES),
    customCover: z.string().nullable().optional(),
    redo2: z.array(z.number().int().min(0).max(REDO_MAX)),
});

const animeFinalListInsertSchema = createInsertSchema(animeList, {
    status: importStatusSchema(MediaType.ANIME),
    customCover: z.string().nullable().optional(),
    redo2: z.array(z.number().int().min(0).max(REDO_MAX)),
});

const seriesImportPayloadSchema = seriesCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
});

const animeImportPayloadSchema = animeCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
});


export const tvImportPayloadSchema = z.union([seriesImportPayloadSchema, animeImportPayloadSchema]);

export const tvFinalListInsertSchema = z.union([seriesFinalListInsertSchema, animeFinalListInsertSchema]);

export const seriesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(seriesImportPayloadSchema.shape);

export const animeMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(animeImportPayloadSchema.shape);
