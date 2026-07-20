import {sql} from "drizzle-orm";
import {user} from "./auth.schema";
import {relations} from "drizzle-orm/relations";
import {MediaType, SocialNotifType} from "@/lib/utils/enums";
import {check, index, integer, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {featureRequests} from "@/lib/server/database/schema/feature-votes.schema";


export const socialNotifications = sqliteTable("social_notifications", {
    id: integer().primaryKey().notNull(),
    actorId: integer("actor_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    featureRequestId: integer("feature_request_id").references(() => featureRequests.id, { onDelete: "cascade" }),
    type: text().$type<SocialNotifType>().notNull(),
    read: integer({ mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    uniqueIndex("social_notif_unique")
        .on(table.userId, table.actorId, table.type)
        .where(sql`${table.featureRequestId} IS NULL`),
    uniqueIndex("social_feature_notif_unique")
        .on(table.userId, table.actorId, table.type, table.featureRequestId)
        .where(sql`${table.featureRequestId} IS NOT NULL`),
    index("ix_social_notifications_user_created_at").on(table.userId, table.createdAt),
    index("ix_social_notifications_user_unread").on(table.userId).where(sql`${table.read} = 0`),
]);


export const mediaNotifications = sqliteTable("media_notifications", {
    id: integer().primaryKey().notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mediaId: integer("media_id").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    season: integer("season"),
    episode: integer("episode"),
    isSeasonFinale: integer({ mode: "boolean" }),
    releaseDate: text("release_date"),
    read: integer({ mode: "boolean" }).default(false).notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_media_notifications_user_created_at").on(table.userId, table.createdAt),
    index("ix_media_notifications_media_user_created_at").on(table.mediaType, table.mediaId, table.userId, table.createdAt),
    index("ix_media_notifications_user_unread").on(table.userId).where(sql`${table.read} = 0`),
    check("media_notifications_season_finale_check", sql`${table.isSeasonFinale} IS NULL OR ${table.isSeasonFinale} IN (0, 1)`),
]);


export const socialNotificationsRelations = relations(socialNotifications, ({ one }) => ({
    actor: one(user, {
        fields: [socialNotifications.actorId],
        references: [user.id],
    }),
    recipient: one(user, {
        fields: [socialNotifications.userId],
        references: [user.id],
    }),
    featureRequest: one(featureRequests, {
        fields: [socialNotifications.featureRequestId],
        references: [featureRequests.id],
    }),
}));
