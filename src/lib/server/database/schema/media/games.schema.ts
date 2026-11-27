import {sql} from "drizzle-orm";
import {GamesPlatformsEnum, MediaType} from "@/lib/utils/enums";
import {check, index, integer, real, snakeCase, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes
} from "@/lib/server/database/schema/media/_helper";


export const games = snakeCase.table("games", {
    backdropImageId: text(),
    gameEngine: text(),
    gameModes: text(),
    playerPerspective: text(),
    voteAverage: real(),
    voteCount: real(),
    igdbUrl: text(),
    hltbMainTime: real(),
    hltbLastCheckedAt: text(),
    hltbMainAndExtraTime: real(),
    hltbTotalCompleteTime: real(),
    steamApiId: text(),
    collectionId: integer(),
    apiId: integer().unique().notNull(),
    ...commonMediaCols(MediaType.GAMES),
});


export const gamesList = snakeCase.table("games_list", {
    playtime: integer().default(0),
    platform: text().$type<GamesPlatformsEnum>(),
    achievementsTotal: integer("achievements_total"),
    achievementsUnlocked: integer("achievements_unlocked"),
    ...commonMediaListCols(games.id, MediaType.GAMES),
}, (table) => [
    ...commonMediaListIndexes(table, MediaType.GAMES),
    check("games_list_achievements_check", sql`
        (${table.achievementsUnlocked} IS NULL AND ${table.achievementsTotal} IS NULL)
        OR (${table.achievementsUnlocked} IS NOT NULL AND ${table.achievementsTotal} IS NOT NULL
            AND ${table.achievementsUnlocked} >= 0
            AND ${table.achievementsTotal} >= 1
            AND ${table.achievementsUnlocked} <= ${table.achievementsTotal})
    `),
]);


export const gamesGenre = snakeCase.table("games_genre", {
    ...commonGenericCols(games.id),
}, (table) => commonGenericIndexes(table, "games_genre"));


export const gamesPlatforms = snakeCase.table("games_platforms", {
    ...commonGenericCols(games.id),
}, (table) => commonGenericIndexes(table, "games_platforms"));


export const gamesCompanies = snakeCase.table("games_companies", {
    ...commonGenericCols(games.id),
    publisher: integer({ mode: "boolean" }).default(false).notNull(),
    developer: integer({ mode: "boolean" }).default(false).notNull(),
}, (table) => [
    uniqueIndex("ux_games_companies_media_name_roles").on(table.mediaId, table.name, table.publisher, table.developer),
    index("ix_games_companies_name_media").on(table.name, table.mediaId),
]);


export const gamesTags = snakeCase.table("games_tags", {
    ...commonMediaTagsCols(gamesList.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.GAMES));
