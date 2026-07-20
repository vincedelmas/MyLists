import {index, integer, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {dateAsString, imageUrl} from "@/lib/server/database/custom-types";
import {ApiProviderType, PrivacyType, RatingSystemType, RoleType} from "@/lib/utils/enums";


export const user = sqliteTable("user", {
    id: integer("id").$type<number>().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    createdAt: dateAsString("created_at").notNull(),
    updatedAt: dateAsString("updated_at").notNull(),
    image: imageUrl("image", "profile-covers"),
    profileViews: integer("profile_views").default(0).notNull(),
    role: text("role").$type<RoleType>().default(RoleType.USER).notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
    privacy: text("privacy").$type<PrivacyType>().default(PrivacyType.RESTRICTED).notNull(),
    gridListView: integer("grid_list_view", { mode: "boolean" }).default(true).notNull(),
    showOnboarding: integer("show_onboarding", { mode: "boolean" }).default(true).notNull(),
    showUpdateModal: integer("show_update_modal", { mode: "boolean" }).default(true).notNull(),
    ratingSystem: text("rating_system").$type<RatingSystemType>().default(RatingSystemType.SCORE).notNull(),
    searchSelector: text("search_selector").$type<ApiProviderType>().default(ApiProviderType.TMDB).notNull(),
    backgroundImage: imageUrl("background_image", "profile-back-covers").default("default.jpg").notNull(),
}, (table) => [
    uniqueIndex("user_name_unique").on(table.name),
]);


export const session = sqliteTable("session", {
    id: integer("id").$type<number>().primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
}, (table) => [
    index("session_user_id_idx").on(table.userId),
]);


export const account = sqliteTable("account", {
    id: integer("id").$type<number>().primaryKey(),
    accountId: integer("account_id"),
    providerId: text("provider_id"),
    userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});


export const verification = sqliteTable("verification", {
    id: integer("id").$type<number>().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" })
}, (table) => [
    index("verification_identifier_idx").on(table.identifier),
]);
