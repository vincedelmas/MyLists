import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {books, booksList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {
    importCommentSchema,
    importFavoriteSchema,
    importRatingSchema,
    importRedoSchema,
    importStatusSchema,
    importTotalSchema,
    nullableImportProgressSchema
} from "@/lib/server/domain/imports/import-list-validation";


export type Book = typeof books.$inferSelect;
export type BooksList = typeof booksList.$inferSelect;
export type BooksImportPayload = z.infer<typeof booksImportPayloadSchema>;


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
    status: importStatusSchema(MediaType.BOOKS),
    customCover: z.string().nullable().optional(),
});


const booksCSVListSchema = createInsertSchema(booksList, {
    redo: importRedoSchema,
    total: importTotalSchema,
    rating: importRatingSchema,
    comment: importCommentSchema,
    favorite: importFavoriteSchema,
    actualPage: nullableImportProgressSchema,
    status: importStatusSchema(MediaType.BOOKS),
});


export const booksImportPayloadSchema = booksCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
});


export const booksMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(booksImportPayloadSchema.shape);
