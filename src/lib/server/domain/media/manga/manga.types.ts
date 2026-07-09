import * as z from "zod";
import {Status} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {manga, mangaList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {mangaAchievements} from "@/lib/server/domain/media/manga/achievements.seed";


export type Manga = typeof manga.$inferSelect;


export type MangaList = typeof mangaList.$inferSelect;
export type MangaListInsert = typeof mangaList.$inferInsert;
export type MangaImportPayload = z.infer<typeof mangaImportPayloadSchema>;
export type MangaFinalListInsert = z.infer<typeof mangaFinalListInsertSchema>;


export type MangaAchCodeName = typeof mangaAchievements[number]["codeName"];


export type UpsertMangaWithDetails = {
    mediaData: typeof manga.$inferInsert,
    genresData?: { name: string }[],
    authorsData?: { name: string }[],
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


export const mangaFinalListInsertSchema = createInsertSchema(mangaList, {
    status: z.enum(Status),
    customCover: z.string().nullable().optional(),
});


const mangaCSVListSchema = createInsertSchema(mangaList, {
    status: z.enum(Status),
    comment: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    addedAt: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    lastUpdated: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    rating: z.preprocess(emptyStringToNull, z.coerce.number().nullable().optional()),
    favorite: z.preprocess(parseBoolean, z.boolean().nullable().optional()),
    redo: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    total: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    currentChapter: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
});


export const mangaImportPayloadSchema = mangaCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    customCover: true,
});


export const mangaMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(mangaImportPayloadSchema.shape);
