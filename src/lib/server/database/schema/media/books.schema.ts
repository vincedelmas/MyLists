import {MediaType} from "@/lib/utils/enums";
import {sql} from "drizzle-orm";
import {customJson, imageUrl} from "@/lib/server/database/custom-types";
import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {check, index, integer, primaryKey, sqliteTable, text} from "drizzle-orm/sqlite-core";
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
    // Representative source for attribution; all volume lookups go through bookEditions.
    apiId: text().unique().notNull(),
    ...commonMediaCols(MediaType.BOOKS),
});


export const bookEditions = sqliteTable("book_editions", {
    id: integer().primaryKey().notNull(),
    mediaId: integer().notNull().references(() => books.id),
    apiId: text().unique().notNull(),
    name: text().notNull(),
    pages: integer(),
    language: text(),
    publishers: text(),
    releaseDate: text(),
    imageCover: imageUrl("image_cover", "books-covers").notNull(),
    authors: customJson<string[]>("authors").default(sql`'[]'`).notNull(),
    isbns: customJson<string[]>("isbns").default(sql`'[]'`).notNull(),
    openLibraryWorkId: text(),
    matchLocked: integer({ mode: "boolean" }).default(false).notNull(),
    lastApiUpdate: text(),
}, table => [
    index("ix_book_editions_work").on(table.mediaId),
    index("ix_book_editions_open_library_work").on(table.openLibraryWorkId),
    check("book_editions_pages_check", sql`${table.pages} IS NULL OR ${table.pages} >= 0`),
]);


export const booksList = sqliteTable("books_list", {
    editionId: integer().references(() => bookEditions.id),
    pages: integer(),
    language: text(),
    publishers: text(),
    editionName: text(),
    // Page counts credited by the reread control, retained when the selected edition changes.
    rereadPages: customJson<number[]>("reread_pages").default(sql`'[]'`).notNull(),
    actualPage: integer(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(books.id, MediaType.BOOKS),
}, (table) => commonMediaListIndexes(table, MediaType.BOOKS));


export const bookWorkExclusions = sqliteTable("book_work_exclusions", {
    firstWorkId: integer().notNull().references(() => books.id, { onDelete: "cascade" }),
    secondWorkId: integer().notNull().references(() => books.id, { onDelete: "cascade" }),
}, table => [primaryKey({ columns: [table.firstWorkId, table.secondWorkId] })]);


export const bookWorkAudit = sqliteTable("book_work_audit", {
    id: integer().primaryKey().notNull(),
    actorId: integer().references(() => user.id, { onDelete: "set null" }),
    action: text().$type<"merge" | "move" | "separate">().notNull(),
    sourceWorkId: integer().notNull(),
    targetWorkId: integer().notNull(),
    snapshot: customJson<Record<string, unknown>>("snapshot").notNull(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});


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
