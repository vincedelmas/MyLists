import {sql} from "drizzle-orm";
import {user} from "@/lib/server/database/schema/auth.schema";
import {customJson} from "@/lib/server/database/custom-types";
import {AchievementCategory, MediaType} from "@/lib/utils/enums";
import {check, index, integer, real, snakeCase, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import type {AchievementBadgePattern, AchievementBadgeShape, AchievementIconKey, AchievementMetadata} from "@/lib/types/achievements.types";


export const achievement = snakeCase.table("achievement", {
    id: integer().primaryKey().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    codeName: text().unique().notNull(),
    mediaType: text().$type<MediaType>(),
    target: integer().default(1).notNull(),
    sortOrder: integer().default(0).notNull(),
    icon: text().$type<AchievementIconKey>().notNull(),
    shape: text().$type<AchievementBadgeShape>().notNull(),
    category: text().$type<AchievementCategory>().notNull(),
    pattern: text().$type<AchievementBadgePattern>().notNull(),
    secret: integer({ mode: "boolean" }).default(false).notNull(),
    rarity: real(),
}, (table) => [
    index("ix_achievement_media_type").on(table.mediaType),
    check("achievement_secret_check", sql`${table.secret} IN (0, 1)`),
    check("achievement_target_positive_check", sql`${table.target} >= 1`),
    index("ix_achievement_category_sort").on(table.category, table.sortOrder),
    check("achievement_rarity_range_check", sql`${table.rarity} IS NULL OR (${table.rarity} >= 0 AND ${table.rarity} <= 100)`),
]);


export const userAchievement = snakeCase.table("user_achievement", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    achievementId: integer().notNull().references(() => achievement.id, { onDelete: "cascade" }),
    completedAt: text(),
    lastCalculatedAt: text(),
    count: real().default(0).notNull(),
    progress: real().default(0).notNull(),
    metadata: customJson<AchievementMetadata>("metadata"),
    completed: integer({ mode: "boolean" }).default(false).notNull(),
}, (table) => [
    index("ix_user_achievement_ach_user").on(table.achievementId, table.userId),
    check("user_achievement_count_nonnegative_check", sql`${table.count} >= 0`),
    check("user_achievement_completed_check", sql`${table.completed} IN (0, 1)`),
    uniqueIndex("user_achievement_user_ach_unique_idx").on(table.userId, table.achievementId),
    index("ix_user_achievement_completed_ach").on(table.achievementId).where(sql`${table.completed} = 1`),
    check("user_achievement_progress_range_check", sql`${table.progress} >= 0 AND ${table.progress} <= 100`),
    check("user_achievement_completed_at_check", sql`${table.completed} = 0 OR ${table.completedAt} IS NOT NULL`),
    check("user_achievement_metadata_json_check", sql`${table.metadata} IS NULL OR json_valid(${table.metadata})`),
    index("ix_user_achievement_user_completed_at").on(table.userId, table.completedAt).where(sql`${table.completed} = 1`),
]);
