import {sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {customJson} from "@/lib/server/database/custom-types";
import {integer, real, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {commMediaEpsCols, commonGenericCols, commonMediaCols, commonMediaListCols, commonMediaListIndexes, commonMediaTagsCols} from "@/lib/server/database/schema/media/_helper";


export const series = sqliteTable("series", {
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


export const seriesList = sqliteTable("series_list", {
    currentSeason: integer().notNull(),
    currentEpisode: integer().notNull(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    redo2: customJson<number[]>("redo2").default(sql`'[]'`).notNull(),
    ...commonMediaListCols(series.id, MediaType.SERIES),
}, (table) => commonMediaListIndexes(table, MediaType.SERIES));


export const seriesGenre = sqliteTable("series_genre", {
    ...commonGenericCols(series.id),
});


export const seriesActors = sqliteTable("series_actors", {
    ...commonGenericCols(series.id),
});


export const seriesNetwork = sqliteTable("series_network", {
    ...commonGenericCols(series.id),
});


export const seriesEpisodesPerSeason = sqliteTable("series_episodes_per_season", {
    ...commMediaEpsCols(series.id),
});


export const seriesTags = sqliteTable("series_tags", {
    ...commonMediaTagsCols(series.id),
});


export const seriesRelations = relations(series, ({ many }) => ({
    seriesEpisodesPerSeasons: many(seriesEpisodesPerSeason),
    seriesGenres: many(seriesGenre),
    seriesTags: many(seriesTags),
    seriesNetworks: many(seriesNetwork),
    seriesLists: many(seriesList),
    seriesActors: many(seriesActors),
}));


export const seriesListRelations = relations(seriesList, ({ one }) => ({
    user: one(user, {
        fields: [seriesList.userId],
        references: [user.id]
    }),
    series: one(series, {
        fields: [seriesList.mediaId],
        references: [series.id]
    }),
}));


export const seriesGenreRelations = relations(seriesGenre, ({ one }) => ({
    series: one(series, {
        fields: [seriesGenre.mediaId],
        references: [series.id]
    }),
}));


export const seriesEpisodesPerSeasonRelations = relations(seriesEpisodesPerSeason, ({ one }) => ({
    series: one(series, {
        fields: [seriesEpisodesPerSeason.mediaId],
        references: [series.id]
    }),
}));


export const seriesActorsRelations = relations(seriesActors, ({ one }) => ({
    series: one(series, {
        fields: [seriesActors.mediaId],
        references: [series.id]
    }),
}));


export const seriesNetworkRelations = relations(seriesNetwork, ({ one }) => ({
    series: one(series, {
        fields: [seriesNetwork.mediaId],
        references: [series.id]
    }),
}));


export const seriesTagsRelations = relations(seriesTags, ({ one }) => ({
    series: one(series, {
        fields: [seriesTags.mediaId],
        references: [series.id]
    }),
    user: one(user, {
        fields: [seriesTags.userId],
        references: [user.id]
    }),
}));
