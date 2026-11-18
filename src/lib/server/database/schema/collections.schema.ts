import {sql} from "drizzle-orm";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {user} from "@/lib/server/database/schema/auth.schema";
import {check, index, integer, snakeCase, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const collections = snakeCase.table("collections", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    ownerId: integer("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    profilePosition: integer("profile_position"),
    title: text("title").notNull(),
    description: text("description"),
    viewCount: integer("view_count").default(0).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    copiedCount: integer("copied_count").default(0).notNull(),
    ordered: integer("ordered", { mode: "boolean" }).default(false).notNull(),
    privacy: text("privacy").$type<PrivacyType>().default(PrivacyType.PRIVATE).notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text("updated_at"),
}, (table) => [
    index("ix_collections_privacy").on(table.privacy),
    index("ix_collections_owner_id").on(table.ownerId),
    check("collections_profile_position_check", sql`${table.profilePosition} > 0`),
    uniqueIndex("ux_collections_owner_profile_position").on(table.ownerId, table.profilePosition),
    check("collections_ordered_check", sql`${table.ordered} IN (0, 1)`),
    check("collections_counters_nonnegative_check", sql`${table.viewCount} >= 0 AND ${table.likeCount} >= 0 AND ${table.copiedCount} >= 0`),
]);


export const collectionItems = snakeCase.table("collection_items", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    annotation: text("annotation"),
    mediaId: integer("media_id").notNull(),
    orderIndex: integer("order_index").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    check("collection_items_order_nonnegative_check", sql`${table.orderIndex} >= 0`),
    uniqueIndex("ux_collection_items_collection_order").on(table.collectionId, table.orderIndex),
    uniqueIndex("ux_collection_items_collection_media").on(table.collectionId, table.mediaType, table.mediaId),
    index("ix_collection_items_media_type_media_collection").on(table.mediaType, table.mediaId, table.collectionId),
]);


export const collectionLikes = snakeCase.table("collection_likes", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_collection_likes_user_id").on(table.userId),
    uniqueIndex("ux_collection_likes_collection_user").on(table.collectionId, table.userId),
]);
