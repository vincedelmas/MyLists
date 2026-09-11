import Database from "bun:sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, SocialNotifType, Status} from "@/lib/utils/enums";
import {NotificationsService} from "./notifications.service";
import {NotificationsRepository} from "./notifications.repository";


const context = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));

describe("notifications", () => {
    let sqlite: Database;
    const service = new NotificationsService(NotificationsRepository);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        context.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(context.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        context.db.insert(schema.user).values({
            id: 1, name: "user", email: "user@example.com", emailVerified: true,
            createdAt: "2025-01-01 00:00:00", updatedAt: "2025-01-01 00:00:00",
        }).run();
    });

    afterEach(() => sqlite.close());

    it("returns every social notification but only the latest eight media notifications", async () => {
        const entries = Array.from({ length: 9 }, (_, index) => ({
            id: index + 1,
            createdAt: `2026-09-11 12:00:0${index}`,
        }));

        context.db.insert(schema.user).values(entries.map(({ id, createdAt }) => ({
            id: id + 1, name: `actor-${id}`, email: `actor-${id}@example.com`,
            emailVerified: true, createdAt, updatedAt: createdAt,
        }))).run();
        context.db.insert(schema.socialNotifications).values(entries.map((entry) => ({
            ...entry,
            userId: 1,
            actorId: entry.id + 1,
            read: entry.id === 1,
            type: entry.id === 1 ? SocialNotifType.FOLLOW_REQUESTED : SocialNotifType.NEW_FOLLOWER,
        }))).run();
        context.db.insert(schema.mediaNotifications).values(entries.map((entry) => ({
            ...entry,
            userId: 1,
            mediaId: entry.id,
            mediaType: MediaType.MOVIES,
            name: `Movie ${entry.id}`,
        }))).run();

        const social = await service.getLastNotifications(1, "social");
        const media = await service.getLastNotifications(1, "media");

        expect(social.map(({ id }) => id)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
        expect(media.map(({ id }) => id)).toEqual([9, 8, 7, 6, 5, 4, 3, 2]);
    });

    it.each([MediaType.MOVIES, MediaType.SERIES])("avoids duplicates from overlapping %s runs and preserves new releases", async (mediaType) => {
        const release = {
            userId: 1, mediaId: 1, mediaName: "Media", imageCover: "cover.jpg", status: Status.PLAN_TO_WATCH,
            date: "2026-09-10", seasonToAir: 1, episodeToAir: 1, lastEpisode: 8,
        };

        await Promise.all([
            service.createMediaNotifications(mediaType, [release]),
            service.createMediaNotifications(mediaType, [release]),
        ]);
        expect(context.db.select().from(schema.mediaNotifications).all()).toHaveLength(1);

        await service.createMediaNotifications(mediaType, [{ ...release, date: "2026-09-17", episodeToAir: 2 }]);
        expect(context.db.select().from(schema.mediaNotifications).all()).toHaveLength(2);

        // SQLite timestamps have second precision; multiple releases can share a timestamp.
        context.db.update(schema.mediaNotifications).set({ createdAt: "2026-09-07 12:00:00" }).run();
        await service.createMediaNotifications(mediaType, [{ ...release, date: "2026-09-17", episodeToAir: 2 }]);
        expect(context.db.select().from(schema.mediaNotifications).all()).toHaveLength(2);
    });
});
