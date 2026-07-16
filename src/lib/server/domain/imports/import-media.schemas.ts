import * as z from "zod";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {GamesPlatformsEnum, MediaType, Status} from "@/lib/utils/enums";
import {REDO_MAX} from "@/lib/utils/constants";
import {
    emptyStringToNull,
    importCommentSchema,
    importFavoriteSchema,
    importPlaytimeSchema,
    importPositiveProgressSchema,
    importProgressSchema,
    importRatingSchema,
    importRedoSchema,
    importStatusSchema,
    importTotalSchema,
    nullableImportProgressSchema,
} from "@/lib/server/domain/imports/import-list-validation";


const parseRedo2 = (value: unknown) => {
    if (value === "") return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
            return JSON.parse(trimmed);
        }
        catch {
            return value;
        }
    }

    const parts = trimmed.split(",").map((part) => part.trim());
    if (parts.some((part) => part === "")) return value;
    return parts.map(Number);
};


const importedCommonShape = {
    favorite: importFavoriteSchema,
    comment: importCommentSchema,
    rating: importRatingSchema,
};


const storedCommonShape = {
    userId: z.number().int().positive(),
    mediaId: z.number().int().positive(),
    favorite: z.boolean().nullable().optional(),
    comment: z.string().nullable().optional(),
    rating: z.number().min(0).max(10).nullable().optional(),
    customCover: z.string().nullable().optional(),
    addedAt: z.string().nullable().optional(),
    lastUpdated: z.string().nullable().optional(),
};


const redo2Schema = z.preprocess(
    parseRedo2,
    z.array(z.coerce.number().int().min(0).max(REDO_MAX)).optional(),
);


const tvPayloadFor = (kind: typeof MediaType.SERIES | typeof MediaType.ANIME) => z.object({
    ...importedCommonShape,
    status: importStatusSchema(kind),
    currentSeason: importPositiveProgressSchema,
    currentEpisode: importProgressSchema,
    redo: importRedoSchema,
    redo2: redo2Schema,
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


export const moviesImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.MOVIES),
    redo: importRedoSchema,
    total: importTotalSchema,
});

export const moviesFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.MOVIES),
    redo: z.number().int().min(0).max(REDO_MAX),
    total: z.number().int().min(0),
});

export const moviesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(moviesImportPayloadSchema.shape);

export type MoviesImportPayload = z.infer<typeof moviesImportPayloadSchema>;
export type MovieFinalListInsert = z.infer<typeof moviesFinalListInsertSchema>;


export const gamesImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.GAMES),
    playtime: importPlaytimeSchema,
    platform: z.preprocess(emptyStringToNull, z.enum(GamesPlatformsEnum).nullable().optional()),
});

export const gamesFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.GAMES),
    playtime: z.number().int().min(0),
    platform: z.enum(GamesPlatformsEnum).nullable().optional(),
});

export const gamesMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(gamesImportPayloadSchema.shape);

export type GamesImportPayload = z.infer<typeof gamesImportPayloadSchema>;
export type GamesFinalListInsert = z.infer<typeof gamesFinalListInsertSchema>;


export const booksImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.BOOKS),
    actualPage: nullableImportProgressSchema,
    redo: importRedoSchema,
    total: importTotalSchema,
});

export const booksFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.BOOKS),
    actualPage: z.number().int().min(0).nullable(),
    redo: z.number().int().min(0).max(REDO_MAX),
    total: z.number().int().min(0),
});

export const booksMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(booksImportPayloadSchema.shape);

export type BooksImportPayload = z.infer<typeof booksImportPayloadSchema>;
export type BooksFinalListInsert = z.infer<typeof booksFinalListInsertSchema>;


export const mangaImportPayloadSchema = z.object({
    ...importedCommonShape,
    status: importStatusSchema(MediaType.MANGA),
    currentChapter: importProgressSchema,
    redo: importRedoSchema,
    total: importTotalSchema,
});

export const mangaFinalListInsertSchema = z.object({
    ...storedCommonShape,
    status: importStatusSchema(MediaType.MANGA),
    currentChapter: z.number().int().min(0),
    redo: z.number().int().min(0).max(REDO_MAX),
    total: z.number().int().min(0),
});

export const mangaMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(mangaImportPayloadSchema.shape);

export type MangaImportPayload = z.infer<typeof mangaImportPayloadSchema>;
export type MangaFinalListInsert = z.infer<typeof mangaFinalListInsertSchema>;
