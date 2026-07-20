import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {user} from "@/lib/server/database/schema/auth.schema";
import {check, index, integer, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const collections = sqliteTable("collections", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    ownerId: integer("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    mediaType: text("media_type").$type<MediaType>().notNull(),
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
    index("ix_collections_media_type").on(table.mediaType),
    check("collections_counters_nonnegative_check", sql`
        ${table.viewCount} >= 0 AND ${table.likeCount} >= 0 AND ${table.copiedCount} >= 0
    `),
    check("collections_ordered_check", sql`${table.ordered} IN (0, 1)`),
]);


export const collectionItems = sqliteTable("collection_items", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    annotation: text("annotation"),
    mediaId: integer("media_id").notNull(),
    orderIndex: integer("order_index").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    uniqueIndex("ux_collection_items_collection_media").on(table.collectionId, table.mediaId),
    uniqueIndex("ux_collection_items_collection_order").on(table.collectionId, table.orderIndex),
    index("ix_collection_items_media_type_media_collection").on(table.mediaType, table.mediaId, table.collectionId),
    check("collection_items_order_nonnegative_check", sql`${table.orderIndex} >= 0`),
]);


export const collectionLikes = sqliteTable("collection_likes", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_collection_likes_user_id").on(table.userId),
    uniqueIndex("ux_collection_likes_collection_user").on(table.collectionId, table.userId),
]);


export const collectionsRelations = relations(collections, ({ one, many }) => ({
    owner: one(user, {
        references: [user.id],
        fields: [collections.ownerId],
    }),
    items: many(collectionItems),
    likes: many(collectionLikes),
}));


export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
    collection: one(collections, {
        references: [collections.id],
        fields: [collectionItems.collectionId],
    }),
}));


export const collectionLikesRelations = relations(collectionLikes, ({ one }) => ({
    collection: one(collections, {
        references: [collections.id],
        fields: [collectionLikes.collectionId],
    }),
    user: one(user, {
        references: [user.id],
        fields: [collectionLikes.userId],
    }),
}));
