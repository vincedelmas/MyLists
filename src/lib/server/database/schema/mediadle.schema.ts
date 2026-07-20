import {sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {check, integer, real, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const dailyMediadle = sqliteTable("daily_mediadle", {
    id: integer().primaryKey().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
    mediaId: integer().notNull(),
    date: text().notNull(),
    pixelationLevels: integer().default(5).notNull(),
}, (table) => [
    uniqueIndex("ux_daily_mediadle_type_date").on(table.mediaType, table.date),
    check("daily_mediadle_pixelation_levels_positive_check", sql`${table.pixelationLevels} > 0`),
]);


export const mediadleStats = sqliteTable("mediadle_stats", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaType: text().$type<MediaType>().notNull(),
    totalPlayed: integer(),
    totalWon: integer(),
    averageAttempts: real(),
    streak: integer(),
    bestStreak: integer(),
}, (table) => [
    uniqueIndex("ux_mediadle_stats_user_type").on(table.userId, table.mediaType),
    check("mediadle_stats_nonnegative_check", sql`
        (${table.totalPlayed} IS NULL OR ${table.totalPlayed} >= 0)
        AND (${table.totalWon} IS NULL OR ${table.totalWon} >= 0)
        AND (${table.averageAttempts} IS NULL OR ${table.averageAttempts} >= 0)
        AND (${table.streak} IS NULL OR ${table.streak} >= 0)
        AND (${table.bestStreak} IS NULL OR ${table.bestStreak} >= 0)
    `),
    check("mediadle_stats_wins_not_above_played_check", sql`
        ${table.totalWon} IS NULL OR ${table.totalPlayed} IS NULL OR ${table.totalWon} <= ${table.totalPlayed}
    `),
]);


export const userMediadleProgress = sqliteTable("user_mediadle_progress", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    dailyMediadleId: integer().notNull().references(() => dailyMediadle.id),
    attempts: integer().default(0).notNull(),
    completed: integer({ mode: "boolean" }).default(false).notNull(),
    succeeded: integer({ mode: "boolean" }).default(false).notNull(),
    completionTime: text(),
}, (table) => [
    uniqueIndex("ux_user_mediadle_progress_user_daily").on(table.userId, table.dailyMediadleId),
    check("user_mediadle_progress_attempts_nonnegative_check", sql`${table.attempts} >= 0`),
    check("user_mediadle_progress_success_completed_check", sql`${table.succeeded} <= ${table.completed}`),
]);


export const mediadleStatsRelations = relations(mediadleStats, ({ one }) => ({
    user: one(user, {
        fields: [mediadleStats.userId],
        references: [user.id]
    }),
}));


export const userMediadleProgressRelations = relations(userMediadleProgress, ({ one }) => ({
    dailyMediadle: one(dailyMediadle, {
        fields: [userMediadleProgress.dailyMediadleId],
        references: [dailyMediadle.id]
    }),
    user: one(user, {
        fields: [userMediadleProgress.userId],
        references: [user.id]
    }),
}));


export const dailyMediadleRelations = relations(dailyMediadle, ({ many }) => ({
    userMediadleProgresses: many(userMediadleProgress),
}));
