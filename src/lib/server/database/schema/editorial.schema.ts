import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {catalogItem} from "@/lib/server/database/schema/catalog.schema";
import {user} from "@/lib/server/database/schema/auth.schema";
import {check, index, integer, primaryKey, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


/** Editorial catalog objects are intentionally independent from personal list channels. */
export const editorialCollection = sqliteTable("editorial_collection", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    ownerId: integer("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind").$type<MediaType>().notNull(),
    visibility: text("visibility").$type<PrivacyType>().default(PrivacyType.PRIVATE).notNull(),
    ordered: integer("ordered", { mode: "boolean" }).default(false).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    copiedCount: integer("copied_count").default(0).notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text("updated_at"),
}, (table) => [
    check("editorial_collection_kind_check", sql`${table.kind} IN ('series', 'anime', 'movies', 'books', 'games', 'manga')`),
    check("editorial_collection_visibility_check", sql`${table.visibility} IN ('private', 'restricted', 'public')`),
    check("editorial_collection_title_check", sql`length(trim(${table.title})) > 0`),
    check("editorial_collection_view_count_check", sql`${table.viewCount} >= 0`),
    check("editorial_collection_copied_count_check", sql`${table.copiedCount} >= 0`),
    index("ix_editorial_collection_owner").on(table.ownerId, table.kind),
    index("ix_editorial_collection_discovery").on(table.visibility, table.kind),
]);


/** Position belongs to the collection; media identity belongs to the global catalog. */
export const editorialCollectionItem = sqliteTable("editorial_collection_item", {
    collectionId: integer("collection_id").notNull().references(() => editorialCollection.id, { onDelete: "cascade" }),
    catalogItemId: integer("catalog_item_id").notNull().references(() => catalogItem.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    annotation: text("annotation"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    primaryKey({ columns: [table.collectionId, table.catalogItemId], name: "pk_editorial_collection_item" }),
    uniqueIndex("ux_editorial_collection_item_position").on(table.collectionId, table.position),
    index("ix_editorial_collection_item_catalog").on(table.catalogItemId, table.collectionId),
    check("editorial_collection_item_position_check", sql`${table.position} > 0`),
]);


/** Likes have natural collection/user identity; the displayed count is derived. */
export const editorialCollectionLike = sqliteTable("editorial_collection_like", {
    collectionId: integer("collection_id").notNull().references(() => editorialCollection.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    primaryKey({ columns: [table.collectionId, table.userId], name: "pk_editorial_collection_like" }),
    index("ix_editorial_collection_like_user").on(table.userId, table.collectionId),
]);


export const editorialCollectionRelations = relations(editorialCollection, ({ one, many }) => ({
    owner: one(user, { fields: [editorialCollection.ownerId], references: [user.id] }),
    items: many(editorialCollectionItem),
    likes: many(editorialCollectionLike),
}));


export const editorialCollectionItemRelations = relations(editorialCollectionItem, ({ one }) => ({
    collection: one(editorialCollection, { fields: [editorialCollectionItem.collectionId], references: [editorialCollection.id] }),
    catalogItem: one(catalogItem, { fields: [editorialCollectionItem.catalogItemId], references: [catalogItem.id] }),
}));


export const editorialCollectionLikeRelations = relations(editorialCollectionLike, ({ one }) => ({
    collection: one(editorialCollection, { fields: [editorialCollectionLike.collectionId], references: [editorialCollection.id] }),
    user: one(user, { fields: [editorialCollectionLike.userId], references: [user.id] }),
}));
