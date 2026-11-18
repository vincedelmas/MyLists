import {MediaType} from "@/lib/utils/enums";
import {integer, snakeCase, text} from "drizzle-orm/sqlite-core";
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
    pages: integer().notNull(),
    language: text(),
    publishers: text(),
    apiId: text().unique().notNull(),
    ...commonMediaCols(MediaType.BOOKS),
});


export const booksList = snakeCase.table("books_list", {
    actualPage: integer(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(books.id, MediaType.BOOKS),
}, (table) => commonMediaListIndexes(table, MediaType.BOOKS));


export const booksGenre = snakeCase.table("books_genre", {
    ...commonGenericCols(books.id),
}, (table) => commonGenericIndexes(table, "books_genre"));


export const booksAuthors = snakeCase.table("books_authors", {
    ...commonGenericCols(books.id),
}, (table) => commonGenericIndexes(table, "books_authors"));


export const booksTags = snakeCase.table("books_tags", {
    ...commonMediaTagsCols(books.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.BOOKS));
