import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {customJson} from "@/lib/server/database/custom-types";
import {user} from "@/lib/server/database/schema/auth.schema";
import {catalogItem, tvSeason} from "@/lib/server/database/schema/catalog.schema";
import {GamesPlatformsEnum, MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {check, foreignKey, index, integer, primaryKey, real, SQLiteColumn, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


const mediaKindCheck = (column: SQLiteColumn) => sql`${column} IN ('series', 'anime', 'movies', 'books', 'games', 'manga')`;


/** Publication switch for a personal list. Aggregate values live in libraryStats. */
export const profileMediaChannel = sqliteTable("profile_media_channel", {
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MediaType>().notNull(),
    enabled: integer("enabled", { mode: "boolean" }).default(false).notNull(),
    views: integer("views").default(0).notNull(),
}, (table) => [
    primaryKey({ columns: [table.userId, table.kind], name: "pk_profile_media_channel" }),
    check("profile_media_channel_kind_check", mediaKindCheck(table.kind)),
    check("profile_media_channel_views_check", sql`${table.views} >= 0`),
    index("ix_profile_media_channel_kind_enabled").on(table.kind, table.enabled),
]);


export const libraryEntry = sqliteTable("library_entry", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "restrict" }),
    status: text("status").$type<Status>().notNull(),
    favorite: integer("favorite", { mode: "boolean" }).default(false).notNull(),
    comment: text("comment"),
    rating: real("rating"),
    customCover: text("custom_cover"),
    addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at"),
}, (table) => [
    uniqueIndex("ux_library_entry_user_catalog_item").on(table.userId, table.catalogItemId),
    uniqueIndex("ux_library_entry_id_catalog_item").on(table.id, table.catalogItemId),
    index("ix_library_entry_catalog_user_rating").on(table.catalogItemId, table.userId, table.rating),
    index("ix_library_entry_user_status").on(table.userId, table.status),
    check("library_entry_rating_check", sql`${table.rating} IS NULL OR (${table.rating} >= 0 AND ${table.rating} <= 10)`),
    check("library_entry_status_check", sql`${table.status} IN ('Reading', 'Playing', 'Watching', 'Completed', 'Multiplayer', 'Endless', 'On Hold', 'Random', 'Dropped', 'Plan to Watch', 'Plan to Play', 'Plan to Read')`),
]);


/** TV progress is concrete and canonical; it is not forced through a generic progress table. */
export const tvProgress = sqliteTable("tv_progress", {
    libraryEntryId: integer("library_entry_id").primaryKey().notNull().references(() => libraryEntry.id, { onDelete: "cascade" }),
    currentSeason: integer("current_season").default(1).notNull(),
    currentEpisode: integer("current_episode").default(0).notNull(),
    watchedEpisodes: integer("watched_episodes").default(0).notNull(),
}, (table) => [
    check("tv_progress_season_check", sql`${table.currentSeason} > 0`),
    check("tv_progress_episode_check", sql`${table.currentEpisode} >= 0`),
    check("tv_progress_watched_check", sql`${table.watchedEpisodes} >= 0`),
]);


/** One canonical count includes the initial watch; redo and total are projections. */
export const movieProgress = sqliteTable("movie_progress", {
    libraryEntryId: integer("library_entry_id").primaryKey().notNull().references(() => libraryEntry.id, { onDelete: "cascade" }),
    watchCount: integer("watch_count").default(0).notNull(),
}, (table) => [
    check("movie_progress_watch_count_check", sql`${table.watchCount} >= 0 AND ${table.watchCount} <= 101`),
]);


/** Mutable total playtime and the user's selected platform for one game entry. */
export const gameProgress = sqliteTable("game_progress", {
    libraryEntryId: integer("library_entry_id").primaryKey().notNull().references(() => libraryEntry.id, { onDelete: "cascade" }),
    playtimeMinutes: integer("playtime_minutes").default(0).notNull(),
    platform: text("platform").$type<GamesPlatformsEnum>(),
}, (table) => [
    check("game_progress_playtime_check", sql`${table.playtimeMinutes} >= 0 AND ${table.playtimeMinutes} <= 1800000`),
    check("game_progress_platform_check", sql`${table.platform} IS NULL OR ${table.platform} IN ('PC', 'DOS', 'Iphone', 'Android', 'visionOS', 'Windows Phone', 'Playstation 5', 'Playstation 4', 'Playstation 3', 'Playstation 2', 'Playstation', 'PSP', 'PS Vita', 'Playstation VR', 'Playstation VR2', 'Xbox Series', 'Xbox One', 'Xbox 360', 'Xbox', 'Switch 2', 'Switch', 'Wii U', 'Wii', 'Gamecube', 'Nintendo 64', 'SNES', 'NES', 'Nintendo 3DS', 'Nintendo DS', 'GB Advance', 'GB Color', 'Game Boy', 'Game & Watch', 'Dreamcast', 'Sega Saturn', 'Sega Genesis', 'Sega Game Gear', 'Sega Master System', 'Neo Geo', 'Atari 2600', 'Atari 5200', 'Atari 7800', 'Atari Jaguar', 'Atari Lynx', 'Meta Quest', 'Oculus', 'Arcade', 'Retro Computer', 'Other Console', 'Other Handheld', 'Other Mobile', 'Other VR', 'Old Sega', 'Old Atari', 'Other')`),
]);


/** Current-pass position, completed rereads, and the historical page total are deliberately distinct. */
export const bookProgress = sqliteTable("book_progress", {
    libraryEntryId: integer("library_entry_id").primaryKey().notNull().references(() => libraryEntry.id, { onDelete: "cascade" }),
    currentPage: integer("current_page"),
    rereadCount: integer("reread_count").default(0).notNull(),
    totalPagesRead: integer("total_pages_read").default(0).notNull(),
}, (table) => [
    check("book_progress_current_page_check", sql`${table.currentPage} IS NULL OR (${table.currentPage} >= 0 AND ${table.currentPage} <= 10000000)`),
    check("book_progress_reread_check", sql`${table.rereadCount} >= 0 AND ${table.rereadCount} <= 100`),
    check("book_progress_total_pages_check", sql`${table.totalPagesRead} >= 0 AND ${table.totalPagesRead} <= 10000000`),
]);


/** Current position, rereads and historical total stay distinct for nullable chapter metadata. */
export const mangaProgress = sqliteTable("manga_progress", {
    libraryEntryId: integer("library_entry_id").primaryKey().notNull().references(() => libraryEntry.id, { onDelete: "cascade" }),
    currentChapter: integer("current_chapter").default(0).notNull(),
    rereadCount: integer("reread_count").default(0).notNull(),
    totalChaptersRead: integer("total_chapters_read").default(0).notNull(),
}, (table) => [
    check("manga_progress_current_chapter_check", sql`${table.currentChapter} >= 0 AND ${table.currentChapter} <= 10000000`),
    check("manga_progress_reread_check", sql`${table.rereadCount} >= 0 AND ${table.rereadCount} <= 100`),
    check("manga_progress_total_chapters_check", sql`${table.totalChaptersRead} >= 0 AND ${table.totalChaptersRead} <= 10000000`),
]);


/** One row per rewatched season replaces the positional redo2 JSON array. */
export const tvSeasonRewatch = sqliteTable("tv_season_rewatch", {
    libraryEntryId: integer("library_entry_id").notNull(),
    catalogItemId: integer("catalog_item_id").notNull(),
    seasonNumber: integer("season_number").notNull(),
    count: integer("count").notNull(),
}, (table) => [
    primaryKey({ columns: [table.libraryEntryId, table.seasonNumber], name: "pk_tv_season_rewatch" }),
    foreignKey({
        columns: [table.libraryEntryId, table.catalogItemId],
        foreignColumns: [libraryEntry.id, libraryEntry.catalogItemId],
        name: "fk_tv_season_rewatch_entry_catalog",
    }).onDelete("cascade"),
    foreignKey({
        columns: [table.catalogItemId, table.seasonNumber],
        foreignColumns: [tvSeason.catalogItemId, tvSeason.seasonNumber],
        name: "fk_tv_season_rewatch_season",
    }).onDelete("cascade"),
    check("tv_season_rewatch_count_check", sql`${table.count} > 0 AND ${table.count} <= 100`),
    index("ix_tv_season_rewatch_catalog_season").on(table.catalogItemId, table.seasonNumber),
]);


export const libraryTag = sqliteTable("library_tag", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MediaType>().notNull(),
    name: text("name").notNull(),
}, (table) => [
    uniqueIndex("ux_library_tag_user_kind_name").on(table.userId, table.kind, table.name),
    index("ix_library_tag_user_kind").on(table.userId, table.kind),
    check("library_tag_kind_check", mediaKindCheck(table.kind)),
    check("library_tag_name_check", sql`length(trim(${table.name})) > 0`),
]);


export const libraryEntryTag = sqliteTable("library_entry_tag", {
    libraryEntryId: integer("library_entry_id").notNull().references(() => libraryEntry.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").notNull().references(() => libraryTag.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.libraryEntryId, table.tagId], name: "pk_library_entry_tag" }),
    index("ix_library_entry_tag_tag_entry").on(table.tagId, table.libraryEntryId),
]);


export type LibraryChangeValue = null | boolean | number | string | LibraryChangeValue[] | { [key: string]: LibraryChangeValue };
export type LibraryChangePayload = { oldValue: LibraryChangeValue; newValue: LibraryChangeValue };


export const libraryChange = sqliteTable("library_change", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    libraryEntryId: integer("library_entry_id").notNull().references(() => libraryEntry.id, { onDelete: "cascade" }),
    mediaNameSnapshot: text("media_name_snapshot"),
    updateType: text("update_type").$type<UpdateType>().notNull(),
    payload: customJson<LibraryChangePayload>("payload"),
    occurredAt: text("occurred_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_library_change_entry_occurred").on(table.libraryEntryId, table.occurredAt),
    index("ix_library_change_occurred").on(table.occurredAt),
]);


export const libraryActivity = sqliteTable("library_activity", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MediaType>().notNull(),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "restrict" }),
    libraryEntryId: integer("library_entry_id").references(() => libraryEntry.id, { onDelete: "set null" }),
    unitsGained: real("units_gained").notNull(),
    completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
    redo: integer("redo", { mode: "boolean" }).default(false).notNull(),
    hidden: integer("hidden", { mode: "boolean" }).default(false).notNull(),
    monthBucket: text("month_bucket").notNull(),
    lastUpdatedAt: text("last_updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    uniqueIndex("ux_library_activity_user_catalog_month").on(table.userId, table.catalogItemId, table.monthBucket),
    index("ix_library_activity_user_month").on(table.userId, table.monthBucket),
    index("ix_library_activity_month_updated").on(table.monthBucket, table.lastUpdatedAt),
    check("library_activity_kind_check", mediaKindCheck(table.kind)),
    check("library_activity_month_check", sql`${table.monthBucket} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'`),
]);


export const libraryStats = sqliteTable("library_stats", {
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<MediaType>().notNull(),
    timeSpentMinutes: integer("time_spent_minutes").default(0).notNull(),
    totalEntries: integer("total_entries").default(0).notNull(),
    totalRedo: integer("total_redo").default(0).notNull(),
    entriesRated: integer("entries_rated").default(0).notNull(),
    ratingSum: real("rating_sum").default(0).notNull(),
    entriesCommented: integer("entries_commented").default(0).notNull(),
    entriesFavorited: integer("entries_favorited").default(0).notNull(),
    totalSpecific: real("total_specific").default(0).notNull(),
    statusCounts: customJson<Partial<Record<Status, number>>>("status_counts").default(sql`'{}'`).notNull(),
    averageRating: real("average_rating"),
    updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    primaryKey({ columns: [table.userId, table.kind], name: "pk_library_stats" }),
    check("library_stats_kind_check", mediaKindCheck(table.kind)),
    check("library_stats_nonnegative_check", sql`${table.timeSpentMinutes} >= 0 AND ${table.totalEntries} >= 0 AND ${table.totalRedo} >= 0 AND ${table.entriesRated} >= 0 AND ${table.entriesCommented} >= 0 AND ${table.entriesFavorited} >= 0 AND ${table.totalSpecific} >= 0`),
    index("ix_library_stats_kind_time").on(table.kind, table.timeSpentMinutes),
]);


export const libraryEntryRelations = relations(libraryEntry, ({ one, many }) => ({
    user: one(user, { fields: [libraryEntry.userId], references: [user.id] }),
    catalogItem: one(catalogItem, { fields: [libraryEntry.catalogItemId], references: [catalogItem.id] }),
    tvProgress: one(tvProgress),
    movieProgress: one(movieProgress),
    gameProgress: one(gameProgress),
    bookProgress: one(bookProgress),
    mangaProgress: one(mangaProgress),
    tags: many(libraryEntryTag),
    changes: many(libraryChange),
    activities: many(libraryActivity),
    tvSeasonRewatches: many(tvSeasonRewatch),
}));


export const tvProgressRelations = relations(tvProgress, ({ one }) => ({
    libraryEntry: one(libraryEntry, { fields: [tvProgress.libraryEntryId], references: [libraryEntry.id] }),
}));


export const movieProgressRelations = relations(movieProgress, ({ one }) => ({
    libraryEntry: one(libraryEntry, { fields: [movieProgress.libraryEntryId], references: [libraryEntry.id] }),
}));


export const gameProgressRelations = relations(gameProgress, ({ one }) => ({
    libraryEntry: one(libraryEntry, { fields: [gameProgress.libraryEntryId], references: [libraryEntry.id] }),
}));


export const bookProgressRelations = relations(bookProgress, ({ one }) => ({
    libraryEntry: one(libraryEntry, { fields: [bookProgress.libraryEntryId], references: [libraryEntry.id] }),
}));


export const mangaProgressRelations = relations(mangaProgress, ({ one }) => ({
    libraryEntry: one(libraryEntry, { fields: [mangaProgress.libraryEntryId], references: [libraryEntry.id] }),
}));


export const tvSeasonRewatchRelations = relations(tvSeasonRewatch, ({ one }) => ({
    libraryEntry: one(libraryEntry, { fields: [tvSeasonRewatch.libraryEntryId], references: [libraryEntry.id] }),
    season: one(tvSeason, {
        fields: [tvSeasonRewatch.catalogItemId, tvSeasonRewatch.seasonNumber],
        references: [tvSeason.catalogItemId, tvSeason.seasonNumber],
    }),
}));
