import {sql} from "drizzle-orm";
import {user} from "@/lib/server/database/schema/auth.schema";
import {customJson} from "@/lib/server/database/custom-types";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {check, index, integer, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


// Keep the existing SQLite table and constraints so renaming the feature preserves saved data.
export const dynamicLists = sqliteTable("smart_views", {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    profilePosition: integer(),
    spec: customJson<DynamicListSpec>("spec").notNull(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_smart_views_user_id").on(table.userId),
    check("smart_views_spec_json_check", sql`json_valid(${table.spec})`),
    check("smart_views_profile_position_check", sql`${table.profilePosition} > 0`),
    uniqueIndex("ux_smart_views_user_profile_position").on(table.userId, table.profilePosition),
]);
