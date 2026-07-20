import {sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {customJson} from "@/lib/server/database/custom-types";
import {check, integer, real, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {
    commMediaEpsCols,
    commonGenericCols,
    commonGenericIndexes,
    commonMediaCols,
    commonMediaEpsIndexes,
    commonMediaListCols,
    commonMediaListIndexes,
    commonMediaTagsCols,
    commonMediaTagsIndexes
} from "@/lib/server/database/schema/media/_helper";


export const anime = sqliteTable("anime", {
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
    seasonToAir: integer(),
    episodeToAir: integer(),
    nextEpisodeToAir: text(),
    ...commonMediaCols(MediaType.ANIME)
});


export const animeList = sqliteTable("anime_list", {
    currentSeason: integer().notNull(),
    currentEpisode: integer().notNull(),
    redo: integer().default(0).notNull(),
    total: integer("total").default(0).notNull(),
    redo2: customJson<number[]>("redo2").default(sql`'[]'`).notNull(),
    ...commonMediaListCols(anime.id, MediaType.ANIME),
}, (table) => [
    ...commonMediaListIndexes(table, MediaType.ANIME),
    check("anime_list_redo2_json_check", sql`json_valid(${table.redo2})`),
]);


export const animeGenre = sqliteTable("anime_genre", {
    ...commonGenericCols(anime.id),
}, (table) => commonGenericIndexes(table, "anime_genre"));


export const animeActors = sqliteTable("anime_actors", {
    ...commonGenericCols(anime.id),
}, (table) => commonGenericIndexes(table, "anime_actors"));


export const animeNetwork = sqliteTable("anime_network", {
    ...commonGenericCols(anime.id),
}, (table) => commonGenericIndexes(table, "anime_network"));


export const animeEpisodesPerSeason = sqliteTable("anime_episodes_per_season", {
    ...commMediaEpsCols(anime.id),
}, (table) => commonMediaEpsIndexes(table, "anime_episodes_per_season"));


export const animeTags = sqliteTable("anime_tags", {
    ...commonMediaTagsCols(anime.id),
}, (table) => commonMediaTagsIndexes(table, MediaType.ANIME));


export const animeEpisodesPerSeasonRelations = relations(animeEpisodesPerSeason, ({ one }) => ({
    anime: one(anime, {
        fields: [animeEpisodesPerSeason.mediaId],
        references: [anime.id]
    }),
}));


export const animeRelations = relations(anime, ({ many }) => ({
    animeEpisodesPerSeasons: many(animeEpisodesPerSeason),
    animeGenres: many(animeGenre),
    animeTags: many(animeTags),
    animeNetworks: many(animeNetwork),
    animeLists: many(animeList),
}));


export const animeListRelations = relations(animeList, ({ one }) => ({
    anime: one(anime, {
        fields: [animeList.mediaId],
        references: [anime.id]
    }),
    user: one(user, {
        fields: [animeList.userId],
        references: [user.id]
    }),
}));


export const animeGenreRelations = relations(animeGenre, ({ one }) => ({
    anime: one(anime, {
        fields: [animeGenre.mediaId],
        references: [anime.id]
    }),
}));


export const animeNetworkRelations = relations(animeNetwork, ({ one }) => ({
    anime: one(anime, {
        fields: [animeNetwork.mediaId],
        references: [anime.id]
    }),
}));


export const animeTagsRelations = relations(animeTags, ({ one }) => ({
    user: one(user, {
        fields: [animeTags.userId],
        references: [user.id]
    }),
    anime: one(anime, {
        fields: [animeTags.mediaId],
        references: [anime.id]
    }),
}));
