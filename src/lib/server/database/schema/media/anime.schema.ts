import {sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {check, integer, real, snakeCase, text} from "drizzle-orm/sqlite-core";
import {
    commMediaEpsCols,
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaEpsIndexes,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes,
    commonTvSeasonCols,
    commonTvSeasonIndexes
} from "@/lib/server/database/schema/media/_helper";


export const anime = snakeCase.table("anime", {
    backdropPath: text(),
    originalName: text(),
    lastAirDate: text(),
    homepage: text(),
    createdBy: text(),
    duration: integer().notNull(),
    totalSeasons: integer().notNull(),
    totalEpisodes: integer().notNull(),
    originCountry: text(),
    prodStatus: text(),
    voteAverage: real(),
    voteCount: real(),
    popularity: real(),
    seasonToAir: integer(),
    episodeToAir: integer(),
    nextEpisodeToAir: text(),
    apiId: integer().unique().notNull(),
    ...commonMediaCols(MediaType.ANIME),
});


export const animeList = snakeCase.table("anime_list", {
    currentSeason: integer().notNull(),
    currentEpisode: integer().notNull(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(anime.id, MediaType.ANIME),
}, (table) => [
    ...commonMediaListIndexes(table, MediaType.ANIME),
    check("anime_list_redo_check", sql`${table.redo} >= 0`),
]);


export const animeListSeasons = snakeCase.table("anime_list_seasons", {
    ...commonTvSeasonCols(animeList.id),
}, (table) => commonTvSeasonIndexes(table, "anime_list_seasons"));


export const animeGenre = snakeCase.table("anime_genre", {
    ...commonGenericCols(anime.id),
}, (table) => commonGenericIndexes(table, "anime_genre"));


export const animeActors = snakeCase.table("anime_actors", {
    ...commonGenericCols(anime.id),
}, (table) => commonGenericIndexes(table, "anime_actors"));


export const animeNetwork = snakeCase.table("anime_network", {
    ...commonGenericCols(anime.id),
}, (table) => commonGenericIndexes(table, "anime_network"));


export const animeEpisodesPerSeason = snakeCase.table("anime_episodes_per_season", {
    ...commMediaEpsCols(anime.id),
}, (table) => commonMediaEpsIndexes(table, "anime_episodes_per_season"));


export const animeTags = snakeCase.table("anime_tags", {
    ...commonMediaTagsCols(anime.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.ANIME));
