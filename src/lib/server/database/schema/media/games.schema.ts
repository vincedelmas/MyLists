import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {GamesPlatformsEnum, MediaType} from "@/lib/utils/enums";
import {index, integer, real, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes
} from "@/lib/server/database/schema/media/_helper";


export const games = sqliteTable("games", {
    gameEngine: text(),
    gameModes: text(),
    playerPerspective: text(),
    voteAverage: real(),
    voteCount: real(),
    igdbUrl: text(),
    hltbMainTime: real(),
    hltbMainAndExtraTime: real(),
    hltbTotalCompleteTime: real(),
    steamApiId: text(),
    collectionId: integer(),
    apiId: integer().unique().notNull(),
    ...commonMediaCols(MediaType.GAMES),
});


export const gamesList = sqliteTable("games_list", {
    playtime: integer().default(0),
    platform: text().$type<GamesPlatformsEnum>(),
    ...commonMediaListCols(games.id, MediaType.GAMES),
}, (table) => commonMediaListIndexes(table, MediaType.GAMES));


export const gamesGenre = sqliteTable("games_genre", {
    ...commonGenericCols(games.id),
}, (table) => commonGenericIndexes(table, "games_genre"));


export const gamesPlatforms = sqliteTable("games_platforms", {
    ...commonGenericCols(games.id),
}, (table) => commonGenericIndexes(table, "games_platforms"));


export const gamesCompanies = sqliteTable("games_companies", {
    ...commonGenericCols(games.id),
    publisher: integer({ mode: "boolean" }).default(false).notNull(),
    developer: integer({ mode: "boolean" }).default(false).notNull(),
}, (table) => [
    uniqueIndex("ux_games_companies_media_name_roles").on(table.mediaId, table.name, table.publisher, table.developer),
    index("ix_games_companies_name_media").on(table.name, table.mediaId),
]);


export const gamesTags = sqliteTable("games_tags", {
    ...commonMediaTagsCols(games.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.GAMES));


export const gamesRelations = relations(games, ({ many }) => ({
    gamesPlatforms: many(gamesPlatforms),
    gamesCompanies: many(gamesCompanies),
    gamesGenres: many(gamesGenre),
    gamesTags: many(gamesTags),
    gamesLists: many(gamesList),
}));


export const gamesListRelations = relations(gamesList, ({ one }) => ({
    user: one(user, {
        fields: [gamesList.userId],
        references: [user.id]
    }),
    game: one(games, {
        fields: [gamesList.mediaId],
        references: [games.id]
    }),
}));


export const gamesPlatformsRelations = relations(gamesPlatforms, ({ one }) => ({
    game: one(games, {
        fields: [gamesPlatforms.mediaId],
        references: [games.id]
    }),
}));


export const gamesCompaniesRelations = relations(gamesCompanies, ({ one }) => ({
    game: one(games, {
        fields: [gamesCompanies.mediaId],
        references: [games.id]
    }),
}));


export const gamesGenreRelations = relations(gamesGenre, ({ one }) => ({
    game: one(games, {
        fields: [gamesGenre.mediaId],
        references: [games.id]
    }),
}));


export const gamesTagsRelations = relations(gamesTags, ({ one }) => ({
    game: one(games, {
        fields: [gamesTags.mediaId],
        references: [games.id]
    }),
    user: one(user, {
        fields: [gamesTags.userId],
        references: [user.id]
    }),
}));
