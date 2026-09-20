import * as z from "zod";
import {MediaType} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {books, booksList, bookEditions} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {
    emptyStringToNull,
    importCommentSchema,
    importFavoriteSchema,
    importRatingSchema,
    importRedoSchema,
    importStatusSchema,
    importTotalSchema,
    nullableImportProgressSchema
} from "@/lib/server/domain/imports/import-list-validation";


export type Book = typeof books.$inferSelect;
export type BookEdition = typeof bookEditions.$inferSelect;
export type BookEditionData = Omit<typeof bookEditions.$inferInsert, "id" | "mediaId" | "matchLocked">;
export type BooksList = typeof booksList.$inferSelect;
export type BooksImportPayload = z.infer<typeof booksImportPayloadSchema>;


export type InsertBooksWithDetails = {
    mediaData: typeof books.$inferInsert,
    editionData: BookEditionData,
    genresData?: { name: string }[],
    authorsData?: { name: string }[],
};


export type UpsertBooksWithDetails = {
    mediaData: typeof books.$inferInsert;
    editionData: BookEditionData;
    genresData?: { name: string }[],
    authorsData?: { name: string }[],
};


export type UpdateBooksWithDetails = {
    mediaData: Partial<typeof books.$inferInsert> & { apiId: string };
    editionData?: BookEditionData;
    genresData?: { name: string }[],
    authorsData?: { name: string }[],
};


export const booksFinalListInsertSchema = createInsertSchema(booksList, {
    status: importStatusSchema(MediaType.BOOKS),
    rereadPages: z.array(z.number().int().nonnegative()).optional(),
    customCover: z.string().nullable().optional(),
});


const booksCSVListSchema = createInsertSchema(booksList, {
    pages: nullableImportProgressSchema,
    language: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    publishers: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    editionName: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    rereadPages: z.preprocess(value => {
        if (typeof value !== "string") return value;
        try { return JSON.parse(value); } catch { return value; }
    }, z.array(z.number().int().nonnegative()).optional()),
    redo: importRedoSchema,
    total: importTotalSchema,
    rating: importRatingSchema,
    comment: importCommentSchema,
    favorite: importFavoriteSchema,
    actualPage: nullableImportProgressSchema,
    status: importStatusSchema(MediaType.BOOKS),
}).extend({ editionApiId: z.preprocess(emptyStringToNull, z.string().trim().min(1).nullable().optional()) });


export const booksImportPayloadSchema = booksCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    addedAt: true,
    customCover: true,
    lastUpdated: true,
    editionId: true,
});


export const booksMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(booksImportPayloadSchema.shape);
