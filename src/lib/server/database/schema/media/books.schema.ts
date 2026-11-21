import {sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {check, integer, snakeCase, text} from "drizzle-orm/sqlite-core";
import {
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes
} from "@/lib/server/database/schema/media/_helper";


export const books = snakeCase.table("books", {
    language: text(),
    publishers: text(),
    pages: integer().notNull(),
    apiId: text().unique().notNull(),
    ...commonMediaCols(MediaType.BOOKS),
});


export const booksList = snakeCase.table("books_list", {
    actualPage: integer(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    customLanguage: text(),
    customPublisher: text(),
    customReleaseDate: text(),
    customTitle: text().notNull(),
    customPages: integer().notNull(),
    ...commonMediaListCols(books.id, MediaType.BOOKS),
}, (table) => [
    ...commonMediaListIndexes(table, MediaType.BOOKS),
    check("books_list_custom_pages_check", sql`${table.customPages} >= 0`),
]);


export const booksGenre = snakeCase.table("books_genre", {
    ...commonGenericCols(books.id),
}, (table) => commonGenericIndexes(table, "books_genre"));


export const booksAuthors = snakeCase.table("books_authors", {
    ...commonGenericCols(books.id),
}, (table) => commonGenericIndexes(table, "books_authors"));


export const booksTags = snakeCase.table("books_tags", {
    ...commonMediaTagsCols(booksList.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.BOOKS));
