import Database from "bun:sqlite";
import {getTableName} from "drizzle-orm";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {PrivacyType, SocialNotifType, SocialState} from "@/lib/utils/enums";
import {SocialService} from "@/lib/server/domain/social/social.service";
import {SocialRepository} from "@/lib/server/domain/social/social.repository";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


const context = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));

vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));

describe("social relationship and notification transactions", () => {
    let sqlite: Database;
    let social: SocialService;

    const snapshot = () => ({
        followers: context.db.select().from(schema.followers).all(),
        notifications: context.db.select().from(schema.socialNotifications).all(),
    });

    beforeEach(() => {
        sqlite = new Database(":memory:");
        context.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(context.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        context.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `user-${id}`, email: `user-${id}@example.com`, emailVerified: true,
            privacy: PrivacyType.PRIVATE, createdAt: "2025-01-01 00:00:00", updatedAt: "2025-01-01 00:00:00",
        }))).run();
        social = new SocialService(SocialRepository, NotificationsRepository);
    });

    afterEach(() => sqlite.close());

    it("commits a follow request and acceptance with their notifications", () => {
        expect(social.follow(1, 2, true)).toBe(SocialState.REQUESTED);
        expect(snapshot().followers[0].status).toBe(SocialState.REQUESTED);
        expect(snapshot().notifications.map(n => n.type)).toEqual([SocialNotifType.FOLLOW_REQUESTED]);

        social.acceptFollowRequest(1, 2);
        expect(snapshot().followers[0].status).toBe(SocialState.ACCEPTED);
        expect(snapshot().notifications.map(n => n.type)).toEqual([SocialNotifType.FOLLOW_ACCEPTED]);
    });

    it("keeps a follow request actionable when the generic dismiss endpoint is used", async () => {
        const notifications = new NotificationsService(NotificationsRepository);
        social.follow(1, 2, true);
        const before = snapshot();

        await notifications.deleteSocialNotif(2, before.notifications[0].id);
        expect(snapshot()).toEqual(before);

        social.declineFollowRequest(1, 2);
        expect(snapshot().followers).toEqual([]);
        expect(snapshot().notifications).toMatchObject([
            { userId: 1, actorId: 2, type: SocialNotifType.FOLLOW_DECLINED },
        ]);
    });

    it("lets only the recipient dismiss an ordinary notification without removing the follow", async () => {
        const notifications = new NotificationsService(NotificationsRepository);
        social.follow(1, 2, false);
        const before = snapshot();

        await notifications.deleteSocialNotif(1, before.notifications[0].id);
        expect(snapshot()).toEqual(before);

        await notifications.deleteSocialNotif(2, before.notifications[0].id);
        expect(snapshot()).toEqual({ followers: before.followers, notifications: [] });
    });

    it("rolls back a new follow and notification deletion if the replacement notification fails", () => {
        context.db.insert(schema.socialNotifications).values({ userId: 1, actorId: 2, type: SocialNotifType.FOLLOW_DECLINED }).run();
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_notification BEFORE INSERT ON ${getTableName(schema.socialNotifications)}
            BEGIN SELECT RAISE(ABORT, 'notification failed'); END`);

        expect(() => social.follow(1, 2, true)).toThrow();
        expect(snapshot()).toEqual(before);
    });

    it.each(["accept", "decline"])("rolls back %s if its notification fails", (action) => {
        social.follow(1, 2, true);
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_notification BEFORE INSERT ON ${getTableName(schema.socialNotifications)}
            BEGIN SELECT RAISE(ABORT, 'notification failed'); END`);

        expect(() => action === "accept" ? social.acceptFollowRequest(1, 2) : social.declineFollowRequest(1, 2)).toThrow();
        expect(snapshot()).toEqual(before);
    });

    it.each(["unfollow", "remove"])("rolls back %s if notification cleanup fails", (action) => {
        social.follow(1, 2, true);
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_notification BEFORE DELETE ON ${getTableName(schema.socialNotifications)}
            BEGIN SELECT RAISE(ABORT, 'notification failed'); END`);

        expect(() => action === "unfollow" ? social.unfollow(1, 2) : social.removeFollower(1, 2)).toThrow();
        expect(snapshot()).toEqual(before);
    });
});
