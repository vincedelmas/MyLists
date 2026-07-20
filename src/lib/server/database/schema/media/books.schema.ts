import {MediaType} from "@/lib/utils/enums";
import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {integer, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes
} from "@/lib/server/database/schema/media/_helper";


export const books = sqliteTable("books", {
    pages: integer().notNull(),
    language: text(),
    publishers: text(),
    apiId: text().unique().notNull(),
    ...commonMediaCols(MediaType.BOOKS),
});


export const booksList = sqliteTable("books_list", {
    actualPage: integer(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(books.id, MediaType.BOOKS),
}, (table) => commonMediaListIndexes(table, MediaType.BOOKS));


export const booksGenre = sqliteTable("books_genre", {
    ...commonGenericCols(books.id),
}, (table) => commonGenericIndexes(table, "books_genre"));


export const booksAuthors = sqliteTable("books_authors", {
    ...commonGenericCols(books.id),
}, (table) => commonGenericIndexes(table, "books_authors"));


export const booksTags = sqliteTable("books_tags", {
    ...commonMediaTagsCols(books.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.BOOKS));


export const booksRelations = relations(books, ({ many }) => ({
    booksAuthors: many(booksAuthors),
    booksGenres: many(booksGenre),
    booksTags: many(booksTags),
    booksLists: many(booksList),
}));


export const booksListRelations = relations(booksList, ({ one }) => ({
    user: one(user, {
        fields: [booksList.userId],
        references: [user.id]
    }),
    book: one(books, {
        fields: [booksList.mediaId],
        references: [books.id]
    }),
}));


export const booksAuthorsRelations = relations(booksAuthors, ({ one }) => ({
    book: one(books, {
        fields: [booksAuthors.mediaId],
        references: [books.id]
    }),
}));


export const booksGenreRelations = relations(booksGenre, ({ one }) => ({
    book: one(books, {
        fields: [booksGenre.mediaId],
        references: [books.id]
    }),
}));


export const booksTagsRelations = relations(booksTags, ({ one }) => ({
    user: one(user, {
        fields: [booksTags.userId],
        references: [user.id]
    }),
    book: one(books, {
        fields: [booksTags.mediaId],
        references: [books.id]
    }),
}));
