import {sql} from "drizzle-orm";
import {customJson} from "@/lib/server/database/custom-types";
import {ProfileCustomKey} from "@/lib/types/profile-custom.types";
import {check, index, integer, real, snakeCase, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {MediaType, SocialState, Status, UpdateType} from "@/lib/utils/enums";
import {user} from "./auth.schema";


export const followers = snakeCase.table("followers", {
    followerId: integer().references(() => user.id, { onDelete: "cascade" }).notNull(),
    followedId: integer().references(() => user.id, { onDelete: "cascade" }).notNull(),
    status: text().$type<SocialState>().default(SocialState.ACCEPTED).notNull(),
}, (table) => [
    uniqueIndex("ux_followers_follower_followed").on(table.followerId, table.followedId),
    index("ix_followers_followed_status_follower").on(table.followedId, table.status, table.followerId),
    check("followers_not_self_check", sql`${table.followerId} <> ${table.followedId}`),
]);


export const userMediaUpdate = snakeCase.table("user_media_update", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer().notNull(),
    mediaName: text().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
    updateType: text().$type<UpdateType>().notNull(),
    payload: customJson<{ old_value: any, new_value: any }>("payload"),
    timestamp: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_user_media_update_media_type_media_id").on(table.mediaType, table.mediaId),
    index("ix_user_media_update_user_timestamp").on(table.userId, table.timestamp),
    index("ix_user_media_update_user_media_kind_timestamp").on(table.userId, table.mediaType, table.mediaId, table.updateType, table.timestamp),
    index("ix_user_media_update_timestamp").on(table.timestamp),
]);

export const userMediaMonthlyActivity = snakeCase.table("user_media_monthly_activity", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer().notNull(),
    monthBucket: text().notNull(),
    progressGained: real().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
    redoGained: integer().default(0).notNull(),
    lastActivityAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    hidden: integer({ mode: "boolean" }).default(false).notNull(),
    hadCompletion: integer({ mode: "boolean" }).default(false).notNull(),
}, (table) => [
    index("ix_user_media_monthly_activity_media_id").on(table.mediaId),
    index("ix_user_media_monthly_activity_media_type").on(table.mediaType),
    index("ix_user_media_monthly_activity_month_bucket").on(table.monthBucket),
    check("user_media_monthly_activity_redo_nonnegative_check", sql`${table.redoGained} >= 0`),
    index("ix_user_media_monthly_activity_user_last_activity").on(table.userId, table.lastActivityAt),
    check("user_media_monthly_activity_progress_nonnegative_check", sql`${table.progressGained} >= 0`),
    uniqueIndex("ux_user_media_monthly_activity_bucket").on(table.userId, table.mediaId, table.mediaType, table.monthBucket),
    index("ix_user_media_monthly_activity_user_month_type_activity").on(table.userId, table.monthBucket, table.mediaType, table.lastActivityAt),
]);


export const userMediaSettings = snakeCase.table("user_media_settings", {
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
    releaseNotificationsEnabled: integer("release_notifications_enabled", { mode: "boolean" }).default(true).notNull(),
}, (table) => [
    index("ix_user_media_settings_media_type").on(table.mediaType),
    uniqueIndex("ux_user_id_media_type").on(table.userId, table.mediaType),
    check("user_media_settings_counters_nonnegative_check", sql`
        ${table.timeSpent} >= 0 AND ${table.views} >= 0 AND ${table.totalEntries} >= 0
        AND ${table.totalRedo} >= 0 AND ${table.entriesRated} >= 0
        AND ${table.sumEntriesRated} >= 0 AND ${table.entriesCommented} >= 0
        AND ${table.entriesFavorites} >= 0 AND ${table.totalSpecific} >= 0
    `),
    check("user_media_settings_status_counts_json_check", sql`json_valid(${table.statusCounts})`),
]);


export const userMediaStatsHistory = snakeCase.table("user_media_stats_history", {
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
    timestamp: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    mediaId: integer().notNull(),
}, (table) => [
    index("ix_user_media_stats_history_user_id").on(table.userId),
    index("ix_user_media_stats_history_media_type").on(table.mediaType),
    index("ix_user_media_stats_history_timestamp").on(table.timestamp),
    check("user_media_stats_history_status_counts_json_check", sql`json_valid(${table.statusCounts})`),
]);


export const profileCustom = snakeCase.table("profile_custom", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    key: text().$type<ProfileCustomKey>().notNull(),
    value: customJson<any>("value").notNull(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    uniqueIndex("ux_profile_custom_user_id_key").on(table.userId, table.key),
    check("profile_custom_value_json_check", sql`json_valid(${table.value})`),
]);
