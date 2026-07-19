import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {manga, mangaList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {
    importCommentSchema,
    importFavoriteSchema,
    importProgressSchema,
    importRatingSchema,
    importRedoSchema,
    importStatusSchema,
    importTotalSchema
} from "@/lib/server/domain/imports/import-list-validation";


export type Manga = typeof manga.$inferSelect;
export type MangaList = typeof mangaList.$inferSelect;
export type MangaImportPayload = z.infer<typeof mangaImportPayloadSchema>;


export type UpsertMangaWithDetails = {
    mediaData: typeof manga.$inferInsert,
    genresData?: { name: string }[],
    authorsData?: { name: string }[],
};


export const mangaFinalListInsertSchema = createInsertSchema(mangaList, {
    status: importStatusSchema(MediaType.MANGA),
    customCover: z.string().nullable().optional(),
});


const mangaCSVListSchema = createInsertSchema(mangaList, {
    redo: importRedoSchema,
    total: importTotalSchema,
    rating: importRatingSchema,
    comment: importCommentSchema,
    favorite: importFavoriteSchema,
    currentChapter: importProgressSchema,
    status: importStatusSchema(MediaType.MANGA),
});


export const mangaImportPayloadSchema = mangaCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
});


export const mangaMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(mangaImportPayloadSchema.shape);
