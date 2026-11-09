import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {books, booksList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {mediaStatusSchema} from "@/lib/schemas/media-status.schema";
import {
    importCommentSchema,
    importFavoriteSchema,
    importRatingSchema,
    importRedoSchema,
    importTotalSchema,
    nullableImportProgressSchema
} from "@/lib/server/domain/imports/import-list-validation";


export type Book = typeof books.$inferSelect;
export type BooksList = typeof booksList.$inferSelect;


export type InsertBooksWithDetails = {
    mediaData: typeof books.$inferInsert,
    genresData: { name: string }[],
    authorsData: { name: string }[],
};


export type UpsertBooksWithDetails = {
    mediaData: typeof books.$inferInsert;
    genresData?: { name: string }[],
    authorsData?: { name: string }[],
};


export type UpdateBooksWithDetails = {
    mediaData: Partial<typeof books.$inferInsert> & { apiId: string };
    genresData?: { name: string }[],
    authorsData?: { name: string }[],
};


export const booksFinalListInsertSchema = createInsertSchema(booksList, {
    status: mediaStatusSchema(MediaType.BOOKS),
    customCover: z.string().nullable().optional(),
});


const booksCSVListSchema = createInsertSchema(booksList, {
    redo: importRedoSchema,
    total: importTotalSchema,
    rating: importRatingSchema,
    comment: importCommentSchema,
    favorite: importFavoriteSchema,
    actualPage: nullableImportProgressSchema,
    status: mediaStatusSchema(MediaType.BOOKS),
});


export const booksImportPayloadSchema = booksCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
    releaseNotificationsEnabled: true,
});


export const booksMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(booksImportPayloadSchema.shape);
