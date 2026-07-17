import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {PrivacyType, SocialNotifType, SocialState} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: (action: (db: any) => unknown) => action(dbContext.db),
}));

const { SocialGraphQuery } = await import("./social-graph.query");
const { SocialGraphCommands } = await import("./social-graph.commands");


describe("social graph capabilities", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values([
            user(1, "owner", PrivacyType.PRIVATE),
            user(2, "viewer", PrivacyType.PUBLIC),
            user(3, "member", PrivacyType.RESTRICTED),
            user(4, "other", PrivacyType.PUBLIC),
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("keeps public header counts separate from access-scoped social members", async () => {
        await db.insert(schema.followers).values([
            { followerId: 2, followedId: 1, status: SocialState.ACCEPTED },
            { followerId: 3, followedId: 1, status: SocialState.ACCEPTED },
            { followerId: 1, followedId: 3, status: SocialState.ACCEPTED },
            { followerId: 2, followedId: 3, status: SocialState.REQUESTED },
        ]);
        const reader = new SocialGraphQuery();

        expect(await reader.getPublicHeader(1, 2)).toEqual({
            followersCount: 2,
            followsCount: 1,
            followStatus: { followerId: 2, followedId: 1, status: SocialState.ACCEPTED },
        });
        await expect(reader.getFollows(
            { ownerId: 1, actorId: 2, reason: "follower" },
            1,
            2,
            999,
        )).resolves.toEqual({
            follows: [{
                id: 3,
                image: null,
                username: "member",
                privacy: PrivacyType.RESTRICTED,
                myFollowStatus: SocialState.REQUESTED,
            }],
        });
        expect(() => reader.getFollowers(
            { ownerId: 1, actorId: 2, reason: "follower" },
            4,
            2,
        )).toThrow("cannot read social members");
    });

    it("creates and accepts a private follow request atomically and idempotently", async () => {
        const commands = new SocialGraphCommands();

        await expect(commands.follow(2, { id: 1, privacy: PrivacyType.PRIVATE })).resolves.toEqual({
            changed: true,
            status: SocialState.REQUESTED,
        });
        await expect(commands.follow(2, { id: 1, privacy: PrivacyType.PRIVATE })).resolves.toEqual({
            changed: false,
            status: SocialState.REQUESTED,
        });
        expect(await db.select().from(schema.followers)).toEqual([
            { followerId: 2, followedId: 1, status: SocialState.REQUESTED },
        ]);
        expect(await db.select().from(schema.socialNotifications)).toEqual([
            expect.objectContaining({ actorId: 2, userId: 1, type: SocialNotifType.FOLLOW_REQUESTED }),
        ]);

        await expect(commands.respondToRequest(1, 2, "accept")).resolves.toEqual({ status: SocialState.ACCEPTED });
        expect(await db.select().from(schema.followers)).toEqual([
            { followerId: 2, followedId: 1, status: SocialState.ACCEPTED },
        ]);
        expect(await db.select().from(schema.socialNotifications)).toEqual([
            expect.objectContaining({ actorId: 1, userId: 2, type: SocialNotifType.FOLLOW_ACCEPTED }),
        ]);
        await expect(commands.respondToRequest(1, 2, "accept")).rejects.toThrow("canceled");
    });

    it("declines requests and removes accepted followers with their relationship notifications", async () => {
        const commands = new SocialGraphCommands();
        await commands.follow(2, { id: 1, privacy: PrivacyType.PRIVATE });
        await commands.respondToRequest(1, 2, "decline");
        expect(await db.select().from(schema.followers)).toEqual([]);
        expect(await db.select().from(schema.socialNotifications)).toEqual([
            expect.objectContaining({ actorId: 1, userId: 2, type: SocialNotifType.FOLLOW_DECLINED }),
        ]);

        await commands.follow(3, { id: 1, privacy: PrivacyType.PUBLIC });
        expect(await db.select().from(schema.followers)).toEqual([
            { followerId: 3, followedId: 1, status: SocialState.ACCEPTED },
        ]);
        await commands.removeFollower(1, 3);
        expect(await db.select().from(schema.followers)).toEqual([]);
        expect(await db.select().from(schema.socialNotifications)).toEqual([
            expect.objectContaining({ actorId: 1, userId: 2, type: SocialNotifType.FOLLOW_DECLINED }),
        ]);
    });

    it("rejects self relationships before touching storage", async () => {
        const commands = new SocialGraphCommands();
        await expect(commands.follow(1, { id: 1, privacy: PrivacyType.PUBLIC })).rejects.toThrow("follow yourself");
        await expect(commands.unfollow(1, 1)).rejects.toThrow("unfollow yourself");
        expect(await db.select().from(schema.followers)).toEqual([]);
    });
});


const user = (id: number, name: string, privacy: PrivacyType) => ({
    id,
    name,
    privacy,
    email: `${name}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});
