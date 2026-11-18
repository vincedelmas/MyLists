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


export const series = snakeCase.table("series", {
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
    apiId: integer().unique().notNull(),
    episodeToAir: integer(),
    seasonToAir: integer(),
    nextEpisodeToAir: text(),
    ...commonMediaCols(MediaType.SERIES),
});


export const seriesList = snakeCase.table("series_list", {
    currentSeason: integer().notNull(),
    currentEpisode: integer().notNull(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    ...commonMediaListCols(series.id, MediaType.SERIES),
}, (table) => [
    ...commonMediaListIndexes(table, MediaType.SERIES),
    check("series_list_redo_check", sql`${table.redo} >= 0`),
]);


export const seriesListSeasons = snakeCase.table("series_list_seasons", {
    ...commonTvSeasonCols(seriesList.id),
}, (table) => commonTvSeasonIndexes(table, "series_list_seasons"));


export const seriesGenre = snakeCase.table("series_genre", {
    ...commonGenericCols(series.id),
}, (table) => commonGenericIndexes(table, "series_genre"));


export const seriesActors = snakeCase.table("series_actors", {
    ...commonGenericCols(series.id),
}, (table) => commonGenericIndexes(table, "series_actors"));


export const seriesNetwork = snakeCase.table("series_network", {
    ...commonGenericCols(series.id),
}, (table) => commonGenericIndexes(table, "series_network"));


export const seriesEpisodesPerSeason = snakeCase.table("series_episodes_per_season", {
    ...commMediaEpsCols(series.id),
}, (table) => commonMediaEpsIndexes(table, "series_episodes_per_season"));


export const seriesTags = snakeCase.table("series_tags", {
    ...commonMediaTagsCols(series.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.SERIES));
