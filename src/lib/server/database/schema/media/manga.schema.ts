import {MediaType} from "@/lib/utils/enums";
import {integer, real, snakeCase, text} from "drizzle-orm/sqlite-core";
import {
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes
} from "@/lib/server/database/schema/media/_helper";


export const manga = snakeCase.table("manga", {
    originalName: text(),
    chapters: integer(),
    prodStatus: text(),
    siteUrl: text(),
    endDate: text(),
    volumes: integer(),
    voteAverage: real(),
    voteCount: real(),
    popularity: real(),
    publishers: text(),
    apiId: integer().unique().notNull(),
    ...commonMediaCols(MediaType.MANGA),
});


export const mangaList = snakeCase.table("manga_list", {
    currentChapter: integer().notNull(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(manga.id, MediaType.MANGA),
}, (table) => commonMediaListIndexes(table, MediaType.MANGA));


export const mangaGenre = snakeCase.table("manga_genre", {
    ...commonGenericCols(manga.id),
}, (table) => commonGenericIndexes(table, "manga_genre"));


export const mangaAuthors = snakeCase.table("manga_authors", {
    ...commonGenericCols(manga.id),
}, (table) => commonGenericIndexes(table, "manga_authors"));


export const mangaTags = snakeCase.table("manga_tags", {
    ...commonMediaTagsCols(manga.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.MANGA));
