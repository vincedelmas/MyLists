import {MediaType} from "@/lib/utils/enums";
import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {integer, real, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes
} from "@/lib/server/database/schema/media/_helper";


export const movies = sqliteTable("movies", {
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


export const moviesList = sqliteTable("movies_list", {
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(movies.id, MediaType.MOVIES),
}, (table) => commonMediaListIndexes(table, MediaType.MOVIES));


export const moviesGenre = sqliteTable("movies_genre", {
    ...commonGenericCols(movies.id),
}, (table) => commonGenericIndexes(table, "movies_genre"));


export const moviesActors = sqliteTable("movies_actors", {
    ...commonGenericCols(movies.id),
}, (table) => commonGenericIndexes(table, "movies_actors"));


export const moviesTags = sqliteTable("movies_tags", {
    ...commonMediaTagsCols(movies.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.MOVIES));


export const moviesRelations = relations(movies, ({ many }) => ({
    moviesGenres: many(moviesGenre),
    moviesTags: many(moviesTags),
    moviesLists: many(moviesList),
    moviesActors: many(moviesActors),
}));


export const moviesListRelations = relations(moviesList, ({ one }) => ({
    movie: one(movies, {
        fields: [moviesList.mediaId],
        references: [movies.id]
    }),
    user: one(user, {
        fields: [moviesList.userId],
        references: [user.id]
    }),
}));


export const moviesGenreRelations = relations(moviesGenre, ({ one }) => ({
    movie: one(movies, {
        fields: [moviesGenre.mediaId],
        references: [movies.id]
    }),
}));


export const moviesActorsRelations = relations(moviesActors, ({ one }) => ({
    movie: one(movies, {
        fields: [moviesActors.mediaId],
        references: [movies.id]
    }),
}));


export const moviesTagsRelations = relations(moviesTags, ({ one }) => ({
    user: one(user, {
        fields: [moviesTags.userId],
        references: [user.id]
    }),
    movie: one(movies, {
        fields: [moviesTags.mediaId],
        references: [movies.id]
    }),
}));
