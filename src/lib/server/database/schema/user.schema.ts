import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {customJson} from "@/lib/server/database/custom-types";
import {ProfileCustomKey} from "@/lib/types/profile-custom.types";
import {taskHistory} from "@/lib/server/database/schema/admin.schema";
import {index, integer, real, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {MediaType, SocialState, Status, UpdateType} from "@/lib/utils/enums";
import {
    animeList,
    animeTags,
    booksList,
    booksTags,
    collectionLikes,
    collections,
    gamesList,
    gamesTags,
    mangaList,
    mangaTags,
    mediadleStats,
    moviesList,
    moviesTags,
    seriesList,
    seriesTags,
    socialNotifications,
    user,
    userAchievement,
    userMediadleProgress
} from "@/lib/server/database/schema";


export const followers = sqliteTable("followers", {
    followerId: integer().references(() => user.id, { onDelete: "cascade" }).notNull(),
    followedId: integer().references(() => user.id, { onDelete: "cascade" }).notNull(),
    status: text().$type<SocialState>().default(SocialState.ACCEPTED).notNull(),
});


export const userMediaUpdate = sqliteTable("user_media_update", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer().notNull(),
    mediaName: text().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
    updateType: text().$type<UpdateType>().notNull(),
    payload: customJson<{ old_value: any, new_value: any }>("payload"),
    timestamp: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_user_media_update_media_id").on(table.mediaId),
    index("ix_user_media_update_timestamp").on(table.timestamp),
    index("ix_user_media_update_media_type").on(table.mediaType),
    index("ix_user_media_update_user_id").on(table.userId),
]);

export const userMediaActivity = sqliteTable("user_media_activity", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
    specificGained: real().notNull(),
    isCompleted: integer({ mode: "boolean" }).default(false).notNull(),
    isRedo: integer({ mode: "boolean" }).default(false).notNull(),
    monthBucket: text().notNull(),
    lastUpdate: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    hidden: integer({ mode: "boolean" }).default(false).notNull(),
}, (table) => [
    index("ix_user_media_activity_user_id").on(table.userId),
    index("ix_user_media_activity_media_id").on(table.mediaId),
    index("ix_user_media_activity_media_type").on(table.mediaType),
    index("ix_user_media_activity_month_bucket").on(table.monthBucket),
    uniqueIndex("user_media_month_idx").on(table.userId, table.mediaId, table.mediaType, table.monthBucket),
]);


export const userMediaSettings = sqliteTable("user_media_settings", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaType: text().$type<MediaType>().notNull(),
    timeSpent: integer().default(0).notNull(),
    views: integer().default(0).notNull(),
    active: integer({ mode: "boolean" }).notNull(),
    totalEntries: integer().default(0).notNull(),
    totalRedo: integer().default(0).notNull(),
    entriesRated: integer().default(0).notNull(),
    sumEntriesRated: integer().default(0).notNull(),
    entriesCommented: integer().default(0).notNull(),
    entriesFavorites: integer().default(0).notNull(),
    totalSpecific: integer().default(0).notNull(),
    statusCounts: customJson<Record<Status, number>>("status_counts").default(sql`'{}'`).notNull(),
    averageRating: real(),
}, (table) => [
    index("ix_user_media_settings_media_type").on(table.mediaType),
    uniqueIndex("ux_user_id_media_type").on(table.userId, table.mediaType),
]);


export const userMediaStatsHistory = sqliteTable("user_media_stats_history", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaType: text().$type<MediaType>().notNull(),
    timeSpent: integer().default(0).notNull(),
    views: integer().default(0).notNull(),
    active: integer({ mode: "boolean" }).notNull(),
    totalEntries: integer().default(0).notNull(),
    totalRedo: integer().default(0).notNull(),
    entriesRated: integer().default(0).notNull(),
    sumEntriesRated: integer().default(0).notNull(),
    entriesCommented: integer().default(0).notNull(),
    entriesFavorites: integer().default(0).notNull(),
    totalSpecific: integer().default(0).notNull(),
    statusCounts: customJson<Record<Status, number>>("status_counts").default(sql`'{}'`).notNull(),
    averageRating: real(),
    timestamp: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    mediaId: integer().notNull(),
}, (table) => [
    index("ix_user_media_stats_history_user_id").on(table.userId),
    index("ix_user_media_stats_history_media_type").on(table.mediaType),
    index("ix_user_media_stats_history_timestamp").on(table.timestamp),
]);


export const profileCustom = sqliteTable("profile_custom", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    key: text().$type<ProfileCustomKey>().notNull(),
    value: customJson<any>("value").notNull(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_profile_custom_user_id").on(table.userId),
    uniqueIndex("ux_profile_custom_user_id_key").on(table.userId, table.key),
]);


export const userRelations = relations(user, ({ many }) => ({
    mangaLists: many(mangaList),
    gamesLists: many(gamesList),
    animeLists: many(animeList),
    booksLists: many(booksList),
    taskHistory: many(taskHistory),
    seriesLists: many(seriesList),
    moviesLists: many(moviesList),
    notifications: many(socialNotifications),
    animeTags: many(animeTags),
    gamesTags: many(gamesTags),
    booksTags: many(booksTags),
    mangaTags: many(mangaTags),
    moviesTags: many(moviesTags),
    seriesTags: many(seriesTags),
    mediadleStats: many(mediadleStats),
    userMediaUpdates: many(userMediaUpdate),
    userMediaActivity: many(userMediaActivity),
    userAchievements: many(userAchievement),
    userMediaSettings: many(userMediaSettings),
    profileCustom: many(profileCustom),
    userMediadleProgresses: many(userMediadleProgress),
    collections: many(collections),
    collectionLikes: many(collectionLikes),
    followers_followedId: many(followers, {
        relationName: "followers_followedId_user_id"
    }),
    followers_followerId: many(followers, {
        relationName: "followers_followerId_user_id"
    }),
}));

export const followersRelations = relations(followers, ({ one }) => ({
    user_followedId: one(user, {
        fields: [followers.followedId],
        references: [user.id],
        relationName: "followers_followedId_user_id"
    }),
    user_followerId: one(user, {
        fields: [followers.followerId],
        references: [user.id],
        relationName: "followers_followerId_user_id"
    }),
}));

export const userMediaUpdateRelations = relations(userMediaUpdate, ({ one }) => ({
    user: one(user, {
        fields: [userMediaUpdate.userId],
        references: [user.id]
    }),
}));

export const userMediaActivityRelations = relations(userMediaActivity, ({ one }) => ({
    user: one(user, {
        fields: [userMediaActivity.userId],
        references: [user.id]
    }),
}));

export const userMediaSettingsRelations = relations(userMediaSettings, ({ one }) => ({
    user: one(user, {
        fields: [userMediaSettings.userId],
        references: [user.id]
    }),
}));

export const profileCustomRelations = relations(profileCustom, ({ one }) => ({
    user: one(user, {
        fields: [profileCustom.userId],
        references: [user.id]
    }),
}));
