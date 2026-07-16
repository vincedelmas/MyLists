import {MediaType} from "@/lib/utils/enums";
import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {integer, real, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {catalogItem} from "@/lib/server/database/schema/catalog.schema";


export const dailyMediadle = sqliteTable("daily_mediadle", {
    id: integer().primaryKey().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
    mediaId: integer().notNull().references(() => catalogItem.id, { onDelete: "restrict" }),
    date: text().notNull(),
    pixelationLevels: integer().default(5).notNull(),
});


export const mediadleStats = sqliteTable("mediadle_stats", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    mediaType: text().$type<MediaType>().notNull(),
    totalPlayed: integer(),
    totalWon: integer(),
    averageAttempts: real(),
    streak: integer(),
    bestStreak: integer(),
});


export const userMediadleProgress = sqliteTable("user_mediadle_progress", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    dailyMediadleId: integer().notNull().references(() => dailyMediadle.id),
    attempts: integer().default(0).notNull(),
    completed: integer({ mode: "boolean" }).default(false).notNull(),
    succeeded: integer({ mode: "boolean" }).default(false).notNull(),
    completionTime: text(),
});


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
