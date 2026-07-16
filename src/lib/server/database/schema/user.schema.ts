import {sql} from "drizzle-orm";
import {relations} from "drizzle-orm/relations";
import {customJson} from "@/lib/server/database/custom-types";
import {ProfileCustomKey} from "@/lib/types/profile-custom.types";
import {SocialState} from "@/lib/utils/enums";
import {check, index, integer, primaryKey, sqliteTable, text, uniqueIndex} from "drizzle-orm/sqlite-core";
import {taskHistory} from "@/lib/server/database/schema/admin.schema";
import {user} from "@/lib/server/database/schema/auth.schema";
import {socialNotifications} from "@/lib/server/database/schema/notifications.schema";
import {userAchievement} from "@/lib/server/database/schema/achievements.schema";
import {mediadleStats, userMediadleProgress} from "@/lib/server/database/schema/mediadle.schema";
import {
    libraryActivity,
    libraryEntry,
    libraryStats,
    libraryTag,
    profileMediaChannel,
} from "@/lib/server/database/schema/library.schema";
import {
    editorialCollection,
    editorialCollectionLike,
} from "@/lib/server/database/schema/editorial.schema";


export const followers = sqliteTable("followers", {
    followerId: integer().references(() => user.id, { onDelete: "cascade" }).notNull(),
    followedId: integer().references(() => user.id, { onDelete: "cascade" }).notNull(),
    status: text().$type<SocialState>().default(SocialState.ACCEPTED).notNull(),
}, (table) => [
    primaryKey({ columns: [table.followerId, table.followedId], name: "pk_followers" }),
    check("followers_no_self_check", sql`${table.followerId} <> ${table.followedId}`),
    check("followers_status_check", sql`${table.status} IN ('accepted', 'requested')`),
    index("ix_followers_followed_status").on(table.followedId, table.status),
    index("ix_followers_follower_status").on(table.followerId, table.status),
]);


export const profileCustom = sqliteTable("profile_custom", {
    id: integer().primaryKey().notNull(),
    userId: integer().notNull().references(() => user.id, { onDelete: "cascade" }),
    key: text().$type<ProfileCustomKey>().notNull(),
    value: customJson<any>("value").notNull(),
    createdAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [
    index("ix_profile_custom_user_id").on(table.userId),
    uniqueIndex("ux_profile_custom_user_id_key").on(table.userId, table.key),
]);


export const userRelations = relations(user, ({ many }) => ({
    taskHistory: many(taskHistory),
    notifications: many(socialNotifications),
    mediadleStats: many(mediadleStats),
    userAchievements: many(userAchievement),
    profileCustom: many(profileCustom),
    userMediadleProgresses: many(userMediadleProgress),
    profileMediaChannels: many(profileMediaChannel),
    libraryEntries: many(libraryEntry),
    libraryActivities: many(libraryActivity),
    libraryStats: many(libraryStats),
    libraryTags: many(libraryTag),
    editorialCollections: many(editorialCollection),
    editorialCollectionLikes: many(editorialCollectionLike),
    followers_followedId: many(followers, {
        relationName: "followers_followedId_user_id",
    }),
    followers_followerId: many(followers, {
        relationName: "followers_followerId_user_id",
    }),
}));


export const followersRelations = relations(followers, ({ one }) => ({
    user_followedId: one(user, {
        fields: [followers.followedId],
        references: [user.id],
        relationName: "followers_followedId_user_id",
    }),
    user_followerId: one(user, {
        fields: [followers.followerId],
        references: [user.id],
        relationName: "followers_followerId_user_id",
    }),
}));


export const profileCustomRelations = relations(profileCustom, ({ one }) => ({
    user: one(user, {
        fields: [profileCustom.userId],
        references: [user.id],
    }),
}));
