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


export const movies = snakeCase.table("movies", {
    backdropPath: text(),
    originalName: text(),
    homepage: text(),
    duration: integer().notNull(),
    originalLanguage: text(),
    voteAverage: real(),
    voteCount: real(),
    popularity: real(),
    budget: real(),
    revenue: real(),
    tagline: text(),
    apiId: integer().unique().notNull(),
    collectionId: integer(),
    directorName: text(),
    compositorName: text(),
    ...commonMediaCols(MediaType.MOVIES),
});


export const moviesList = snakeCase.table("movies_list", {
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(movies.id, MediaType.MOVIES),
}, (table) => commonMediaListIndexes(table, MediaType.MOVIES));


export const moviesGenre = snakeCase.table("movies_genre", {
    ...commonGenericCols(movies.id),
}, (table) => commonGenericIndexes(table, "movies_genre"));


export const moviesActors = snakeCase.table("movies_actors", {
    ...commonGenericCols(movies.id),
}, (table) => commonGenericIndexes(table, "movies_actors"));


export const moviesTags = snakeCase.table("movies_tags", {
    ...commonMediaTagsCols(moviesList.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.MOVIES));
