import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {FeatureStatus} from "@/lib/utils/enums";
import {user} from "@/lib/server/database/schema/auth.schema";
import {index, integer, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";


export const featureRequests = sqliteTable("feature_requests", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    title: text("title").notNull(),
    adminComment: text("admin_comment"),
    description: text("description").notNull(),
    status: text("status").$type<FeatureStatus>().default(FeatureStatus.UNDER_CONSIDERATION).notNull(),
    createdBy: integer("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_feature_requests_status").on(table.status),
    index("ix_feature_requests_created_at").on(table.createdAt),
]);


export const featureVotes = sqliteTable("feature_votes", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    featureId: integer("feature_id").notNull().references(() => featureRequests.id, { onDelete: "cascade" }),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_feature_votes_user_id").on(table.userId),
    uniqueIndex("ux_feature_votes_feature_user").on(table.featureId, table.userId),
]);


export const featureRequestsRelations = relations(featureRequests, ({ one, many }) => ({
    votes: many(featureVotes),
    author: one(user, {
        references: [user.id],
        fields: [featureRequests.createdBy],
    }),
}));


export const featureVotesRelations = relations(featureVotes, ({ one }) => ({
    user: one(user, {
        references: [user.id],
        fields: [featureVotes.userId],
    }),
    feature: one(featureRequests, {
        fields: [featureVotes.featureId],
        references: [featureRequests.id],
    }),
}));
