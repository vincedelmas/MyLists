import Database from "bun:sqlite";
import {eq, getTableName, sql} from "drizzle-orm";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType} from "@/lib/utils/enums";
import {AccountService} from "@/lib/server/domain/account/account.service";
import {AccountRepository} from "@/lib/server/domain/account/account.repository";
import {InactiveAccountService} from "@/lib/server/domain/account/inactive-account.service";
import {InactiveAccountRepository} from "@/lib/server/domain/account/inactive-account.repository";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe("collection likes after account deletion", () => {
    let sqlite: Database;
    let service: AccountService;

    const snapshot = () => ({
        users: dbContext.db.select().from(schema.user).all(),
        collections: dbContext.db.select().from(schema.collections).all(),
        likes: dbContext.db.select().from(schema.collectionLikes).all(),
        lifecycles: dbContext.db.select().from(schema.inactiveAccountDeletion).all(),
    });

    const likeCounts = () => dbContext.db.select({
        id: schema.collections.id,
        cached: schema.collections.likeCount,
        actual: sql<number>`COUNT(${schema.collectionLikes.id})`,
    }).from(schema.collections)
        .leftJoin(schema.collectionLikes, eq(schema.collectionLikes.collectionId, schema.collections.id))
        .groupBy(schema.collections.id)
        .orderBy(schema.collections.id).all();

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(schema.user).values([1, 2, 3, 4, 5].map(id => ({
            id, name: `delete-user-${id}`, email: `delete-${id}@example.com`, emailVerified: true,
            privacy: PrivacyType.PUBLIC, createdAt: "2020-01-01 00:00:00", updatedAt: "2020-01-01 00:00:00",
        }))).run();
        db.insert(schema.collections).values([
            { id: 10, ownerId: 3, title: "Shared likes", likeCount: 3 },
            { id: 11, ownerId: 3, title: "Last like", likeCount: 1 },
            { id: 12, ownerId: 3, title: "Other user's like", likeCount: 1 },
            { id: 13, ownerId: 1, title: "Deleted user's collection", likeCount: 3 },
            { id: 14, ownerId: 3, title: "No likes", likeCount: 0 },
        ].map(collection => ({ ...collection, mediaType: MediaType.MOVIES, privacy: PrivacyType.PUBLIC }))).run();
        db.insert(schema.collectionLikes).values([
            { collectionId: 10, userId: 1 }, { collectionId: 10, userId: 2 }, { collectionId: 10, userId: 4 },
            { collectionId: 11, userId: 1 }, { collectionId: 12, userId: 2 },
            { collectionId: 13, userId: 1 }, { collectionId: 13, userId: 2 }, { collectionId: 13, userId: 3 },
        ]).run();
        db.insert(schema.inactiveAccountDeletion).values({
            id: 1, userId: 1, username: "delete-user-1", status: "warned",
            lastSeenAt: "2020-01-01 00:00:00", warningSentAt: "2020-02-01 00:00:00",
            deletionScheduledAt: "2020-03-01 00:00:00",
        }).run();
        service = new AccountService(AccountRepository, new InactiveAccountService(InactiveAccountRepository));
    });

    afterEach(() => sqlite.close());

    it.each(["manual", "admin", "inactive"] as const)("updates surviving collection counts and rankings after %s deletion", async type => {
        if (type === "admin") {
            await service.updateUserForAdmin(1, { deleteUser: true });
        }
        else if (type === "inactive") {
            expect(service.deleteUserAccount({ type, userId: 1, lifecycleId: 1, username: "delete-user-1" })).toBe(true);
        }
        else {
            expect(service.deleteUserAccount({ type, userId: 1 })).toBe(true);
        }

        expect(dbContext.db.select().from(schema.user).where(eq(schema.user.id, 1)).get()).toBeUndefined();
        expect(dbContext.db.select().from(schema.collectionLikes).where(eq(schema.collectionLikes.userId, 1)).all()).toEqual([]);
        expect(likeCounts()).toEqual([
            { id: 10, cached: 2, actual: 2 },
            { id: 11, cached: 0, actual: 0 },
            { id: 12, cached: 1, actual: 1 },
            { id: 14, cached: 0, actual: 0 },
        ]);
        const ranked = await CollectionsRepository.getPublicCollections({});
        expect(ranked.items.slice(0, 2).map(collection => collection.id)).toEqual([10, 12]);

        const before = snapshot();
        AccountRepository.deleteUserAccount(1);
        expect(snapshot()).toEqual(before);
    });

    it("does not change likes when the inactive deletion guard rejects the account", () => {
        dbContext.db.update(schema.user).set({ updatedAt: "2020-01-02 00:00:00" }).where(eq(schema.user.id, 1)).run();
        const before = snapshot();

        expect(service.deleteUserAccount({
            type: "inactive", userId: 1, lifecycleId: 1, username: "delete-user-1",
        })).toBe(false);

        expect(snapshot()).toEqual(before);
    });

    it("leaves collections and likes unchanged when an account has no likes", () => {
        const before = snapshot();

        service.deleteUserAccount({ type: "manual", userId: 5 });

        expect(snapshot().collections).toEqual(before.collections);
        expect(snapshot().likes).toEqual(before.likes);
        expect(snapshot().users.map(user => user.id)).toEqual([1, 2, 3, 4]);
    });

    it.each(["manual", "inactive"] as const)("rolls back count changes and lifecycle updates if %s deletion fails", type => {
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_user_delete BEFORE DELETE ON ${getTableName(schema.user)}
            WHEN OLD.id = 1 BEGIN SELECT RAISE(ABORT, 'account deletion failure'); END`);

        expect(() => service.deleteUserAccount({
            type, userId: 1, lifecycleId: 1, username: "delete-user-1",
        })).toThrow();

        expect(snapshot()).toEqual(before);
    });

    it("subtracts every deleted user's likes during bulk cleanup and preserves ineligible accounts", async () => {
        dbContext.db.update(schema.user).set({ emailVerified: false }).where(sql`${schema.user.id} IN (1, 2)`).run();
        dbContext.db.update(schema.user).set({ emailVerified: false, createdAt: sql`datetime('now')` })
            .where(eq(schema.user.id, 4)).run();

        expect(await AccountRepository.deleteNonActivatedOldUsers()).toBe(2);

        expect(snapshot().users.map(user => user.id)).toEqual([3, 4, 5]);
        expect(likeCounts()).toEqual([
            { id: 10, cached: 1, actual: 1 },
            { id: 11, cached: 0, actual: 0 },
            { id: 12, cached: 0, actual: 0 },
            { id: 14, cached: 0, actual: 0 },
        ]);

        const before = snapshot();
        expect(await AccountRepository.deleteNonActivatedOldUsers()).toBe(0);
        expect(snapshot()).toEqual(before);
    });

    it("rolls back the whole bulk cleanup if deleting one of its accounts fails", async () => {
        dbContext.db.update(schema.user).set({ emailVerified: false }).where(sql`${schema.user.id} IN (1, 2)`).run();
        const before = snapshot();
        sqlite.exec(`CREATE TRIGGER fail_user_delete BEFORE DELETE ON ${getTableName(schema.user)}
            WHEN OLD.id = 2 BEGIN SELECT RAISE(ABORT, 'account deletion failure'); END`);

        await expect(AccountRepository.deleteNonActivatedOldUsers()).rejects.toThrow();

        expect(snapshot()).toEqual(before);
    });
});
