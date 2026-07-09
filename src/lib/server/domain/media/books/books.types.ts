import * as z from "zod";
import {Status} from "@/lib/utils/enums";
import {createInsertSchema} from "drizzle-zod";
import {books, booksList} from "@/lib/server/database/schema";
import {minimalMyListsCSVSchema} from "@/lib/types/imports.types";
import {booksAchievements} from "@/lib/server/domain/media/books/achievements.seed";


export type Book = typeof books.$inferSelect;
export type BooksList = typeof booksList.$inferSelect;
export type BooksListInsert = typeof booksList.$inferInsert;
export type BooksImportPayload = z.infer<typeof booksImportPayloadSchema>;
export type BooksFinalListInsert = z.infer<typeof booksFinalListInsertSchema>;
export type BooksAchCodeName = typeof booksAchievements[number]["codeName"];


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


export const booksFinalListInsertSchema = createInsertSchema(booksList, {
    status: z.enum(Status),
    customCover: z.string().nullable().optional(),
});


const booksCSVListSchema = createInsertSchema(booksList, {
    status: z.enum(Status),
    comment: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    addedAt: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    lastUpdated: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
    rating: z.preprocess(emptyStringToNull, z.coerce.number().nullable().optional()),
    favorite: z.preprocess(parseBoolean, z.boolean().nullable().optional()),
    redo: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    total: z.preprocess(emptyStringToUndefined, z.coerce.number().int().optional()),
    actualPage: z.preprocess(emptyStringToNull, z.coerce.number().int().nullable().optional()),
});


export const booksImportPayloadSchema = booksCSVListSchema.omit({
    id: true,
    userId: true,
    mediaId: true,
    customCover: true,
});


export const booksMyListsCSVRowSchema = minimalMyListsCSVSchema.extend(booksImportPayloadSchema.shape);
