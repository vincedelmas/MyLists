import {relations} from "drizzle-orm/relations";
import {user} from "@/lib/server/database/schema/auth.schema";
import {customJson} from "@/lib/server/database/custom-types";
import {AchievementDifficulty, MediaType} from "@/lib/utils/enums";
import {integer, real, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


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
    progress: real(),
    count: real(),
    completed: integer({ mode: "boolean" }),
    completedAt: text(),
    lastCalculatedAt: text(),
}, (table) => [
    uniqueIndex("user_achievement_user_tier_unique_idx").on(table.userId, table.tierId),
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
