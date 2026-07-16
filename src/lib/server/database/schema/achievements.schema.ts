import {relations} from "drizzle-orm/relations";
import {sql} from "drizzle-orm";
import {user} from "@/lib/server/database/schema/auth.schema";
import {customJson} from "@/lib/server/database/custom-types";
import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";
import {check, index, integer, real, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const achievement = sqliteTable("achievement", {
    id: integer().primaryKey().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    codeName: text().unique().notNull(),
    mediaType: text().$type<MediaType>().notNull(),
    value: text(),
});


export const achievementTier = sqliteTable("achievement_tier", {
    id: integer().primaryKey().notNull(),
    achievementId: integer().notNull().references(() => achievement.id, { onDelete: "cascade" }),
    difficulty: text().$type<AchievementDifficulty>().notNull(),
    criteria: customJson<{ count: number }>("criteria").notNull(),
    rarity: real(),
}, (table) => [
    uniqueIndex("achievement_difficulty_unique_idx").on(table.achievementId, table.difficulty),
]);


export const userAchievement = sqliteTable("user_achievement", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    achievementId: integer().notNull().references(() => achievement.id, { onDelete: "cascade" }),
    tierId: integer().notNull().references(() => achievementTier.id, { onDelete: "cascade" }),
    progress: real().default(0).notNull(),
    count: real().default(0).notNull(),
    completed: integer({ mode: "boolean" }).default(false).notNull(),
    completedAt: text(),
    lastCalculatedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    uniqueIndex("ux_user_achievement_identity").on(table.userId, table.achievementId, table.tierId),
    index("ix_user_achievement_user_completed").on(table.userId, table.completed, table.completedAt),
    check("user_achievement_count_check", sql`${table.count} >= 0`),
    check("user_achievement_progress_check", sql`${table.progress} >= 0 AND ${table.progress} <= 100`),
]);


export const achievementRelations = relations(achievement, ({ many }) => ({
    tiers: many(achievementTier),
    userAchievements: many(userAchievement),
}));


export const achievementTierRelations = relations(achievementTier, ({ one, many }) => ({
    achievement: one(achievement, {
        fields: [achievementTier.achievementId],
        references: [achievement.id]
    }),
    userAchievements: many(userAchievement),
}));


export const userAchievementRelations = relations(userAchievement, ({ one }) => ({
    achievementTier: one(achievementTier, {
        fields: [userAchievement.tierId],
        references: [achievementTier.id]
    }),
    achievement: one(achievement, {
        fields: [userAchievement.achievementId],
        references: [achievement.id]
    }),
    user: one(user, {
        fields: [userAchievement.userId],
        references: [user.id]
    }),
}));
