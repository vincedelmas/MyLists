import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {collections, followers, user, userMediaSettings, userMediaUpdate} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {toActor} from "@/lib/server/authorization/utils";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType, PrivacyType, RoleType, SocialState, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { profileCollectionVisibilityCondition } = await import("@/lib/server/authorization/scopes/collection.scope");
const { communityProfileVisibilityCondition, followFeedProfileVisibilityCondition } = await import("@/lib/server/authorization/scopes/profile.scope");
const { UserUpdatesRepository } = await import("@/lib/server/domain/user/user-updates.repository");


describe("authorization visibility scopes", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        const timestamp = "2026-01-01 00:00:00";
        await db.insert(user).values([
            {
                id: 1,
                name: "visitor",
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.PUBLIC,
                email: "visitor@example.com",
            },
            {
                id: 2,
                name: "public-user",
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                email: "public@example.com",
                privacy: PrivacyType.PUBLIC,
            },
            {
                id: 3,
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                name: "restricted-user",
                email: "restricted@example.com",
                privacy: PrivacyType.RESTRICTED,
            },
            {
                id: 4,
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.PRIVATE,
                name: "followed-private-user",
                email: "followed-private@example.com",
            },
            {
                id: 5,
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.PRIVATE,
                name: "requested-private-user",
                email: "requested-private@example.com",
            },
        ]);
        await db
            .insert(followers)
            .values([
                {
                    followerId: 1,
                    followedId: 4,
                    status: SocialState.ACCEPTED,
                },
                {
                    followerId: 1,
                    followedId: 5,
                    status: SocialState.REQUESTED,
                },
            ]);
        await db
            .insert(collections)
            .values([
                {
                    ownerId: 2,
                    title: "Public",
                    mediaType: MediaType.MOVIES,
                    privacy: PrivacyType.PUBLIC,
                },
                {
                    ownerId: 2,
                    title: "Restricted",
                    mediaType: MediaType.MOVIES,
                    privacy: PrivacyType.RESTRICTED,
                },
                {
                    ownerId: 2,
                    title: "Private",
                    mediaType: MediaType.MOVIES,
                    privacy: PrivacyType.PRIVATE,
                },
            ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each([
        ["anonymous", toActor(), [1, 2]],
        ["regular accepted follower", toActor({ id: 1, role: RoleType.USER }), [1, 2, 3, 4]],
        ["manager accepted follower", toActor({ id: 1, role: RoleType.MANAGER }), [1, 2, 3, 4]],
        ["unrelated manager", toActor({ id: 99, role: RoleType.MANAGER }), [1, 2, 3]],
        ["private profile owner", toActor({ id: 4, role: RoleType.USER }), [1, 2, 3, 4]],
        ["admin", toActor({ id: 99, role: RoleType.ADMIN }), [1, 2, 3, 4, 5]],
    ])("filters community profiles for %s", async (_label, actor, expectedIds) => {
        const rows = await db
            .select({ id: user.id })
            .from(user)
            .where(communityProfileVisibilityCondition(actor))
            .orderBy(user.id);

        expect(rows.map(({ id }) => id)).toEqual(expectedIds);
    });

    it("lets admins see private authors in another user's follows feed", async () => {
        await db.insert(followers).values([
            { followerId: 1, followedId: 2, status: SocialState.ACCEPTED },
            { followerId: 1, followedId: 3, status: SocialState.ACCEPTED },
        ]);
        await db.insert(userMediaSettings).values([2, 3, 4, 5].map((userId) => ({
            userId,
            active: true,
            mediaType: MediaType.MOVIES,
        })));
        await db.insert(userMediaUpdate).values([2, 3, 4, 5].map((userId) => ({
            userId,
            mediaId: userId,
            id: userId,
            mediaName: `Media ${userId}`,
            mediaType: MediaType.MOVIES,
            updateType: UpdateType.STATUS,
            timestamp: `2026-01-0${userId} 00:00:00`,
        })));

        const ownerRows = await UserUpdatesRepository.getFollowsUpdates(
            1,
            toActor({ id: 1, role: RoleType.USER }),
        );
        const unrelatedViewerRows = await UserUpdatesRepository.getFollowsUpdates(
            1,
            toActor({ id: 2, role: RoleType.USER }),
        );
        const adminRows = await UserUpdatesRepository.getFollowsUpdates(
            1,
            toActor({ id: 99, role: RoleType.ADMIN }),
        );

        expect(ownerRows.map(({ userId }) => userId)).toEqual([4, 3, 2]);
        expect(unrelatedViewerRows.map(({ userId }) => userId)).toEqual([3, 2]);
        expect(adminRows.map(({ userId }) => userId)).toEqual([4, 3, 2]);
    });

    it.each([
        ["anonymous", toActor(), [1, 2]],
        ["regular accepted follower", toActor({ id: 1, role: RoleType.USER }), [1, 2, 3, 4]],
        ["manager accepted follower", toActor({ id: 1, role: RoleType.MANAGER }), [1, 2, 3, 4]],
        ["unrelated manager", toActor({ id: 99, role: RoleType.MANAGER }), [1, 2, 3]],
        ["private profile owner", toActor({ id: 4, role: RoleType.USER }), [1, 2, 3, 4]],
        ["admin", toActor({ id: 99, role: RoleType.ADMIN }), [1, 2, 3, 4, 5]],
    ])("filters follow-feed authors for %s", async (_label, actor, expectedIds) => {
        const rows = await db
            .select({ id: user.id })
            .from(user)
            .where(followFeedProfileVisibilityCondition(actor))
            .orderBy(user.id);

        expect(rows.map(({ id }) => id)).toEqual(expectedIds);
    });

    it.each([
        ["anonymous", toActor(), [1, 2]],
        ["regular viewer", toActor({ id: 1, role: RoleType.USER }), [1, 2]],
        ["manager", toActor({ id: 1, role: RoleType.MANAGER }), [1, 2]],
        ["owner", toActor({ id: 2, role: RoleType.USER }), [1, 2, 3]],
        ["admin", toActor({ id: 1, role: RoleType.ADMIN }), [1, 2, 3]],
    ])("filters profile collections for %s", async (_label, actor, expectedIds) => {
        const condition = profileCollectionVisibilityCondition(actor, 2);

        const rows = condition
            ? await db.select({ id: collections.id }).from(collections).where(condition).orderBy(collections.id)
            : await db.select({ id: collections.id }).from(collections).orderBy(collections.id);

        expect(rows.map(({ id }) => id)).toEqual(expectedIds);
    });
});
