import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {inactiveAccountDeletion, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: async <T>(action: () => Promise<T>) => action(),
}));


const { UserService } = await import("@/lib/server/domain/user/user.service");
const { UserRepository } = await import("@/lib/server/domain/user/user.repository");
const { InactiveAccountService } = await import("@/lib/server/domain/user/inactive-account.service");
const { InactiveAccountRepository } = await import("@/lib/server/domain/user/inactive-account.repository");


describe("InactiveAccountRepository.markAsDeleted", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("marks a due inactive lifecycle row as deleted", async () => {
        const userId = await insertUser({ updatedAt: "2024-01-01 00:00:00" });
        const lifecycleId = await insertLifecycle({
            userId,
            status: "warned",
            lastSeenAt: "2024-01-01 00:00:00",
            deletionScheduledAt: "2024-02-01 00:00:00",
        });

        const marked = await InactiveAccountRepository.markAsDeleted(lifecycleId, userId, "renamed-user");
        const lifecycle = await getLifecycle(lifecycleId);

        expect(marked).toBe(true);
        expect(lifecycle?.deletedAt).toBeTruthy();
        expect(lifecycle?.lastEmailError).toBeNull();
        expect(lifecycle?.warningTokenHash).toBeNull();
        expect(lifecycle?.status).toBe("deleted");
        expect(lifecycle?.username).toBe("renamed-user");
    });

    it("does not mark as deleted when the user was seen after the lifecycle snapshot", async () => {
        const userId = await insertUser({ updatedAt: "2024-01-02 00:00:00" });
        const lifecycleId = await insertLifecycle({
            userId,
            status: "warned",
            lastSeenAt: "2024-01-01 00:00:00",
            deletionScheduledAt: "2024-02-01 00:00:00",
        });

        const marked = await InactiveAccountRepository.markAsDeleted(lifecycleId, userId, "active-user");
        const lifecycle = await getLifecycle(lifecycleId);

        expect(marked).toBe(false);
        expect(lifecycle?.deletedAt).toBeNull();
        expect(lifecycle?.status).toBe("warned");
    });

    it("does not mark as deleted before the scheduled deletion date", async () => {
        const userId = await insertUser({ updatedAt: "2024-01-01 00:00:00" });
        const lifecycleId = await insertLifecycle({
            userId,
            status: "warned",
            lastSeenAt: "2024-01-01 00:00:00",
            deletionScheduledAt: "2999-01-01 00:00:00",
        });

        const marked = await InactiveAccountRepository.markAsDeleted(lifecycleId, userId, "future-user");
        const lifecycle = await getLifecycle(lifecycleId);

        expect(marked).toBe(false);
        expect(lifecycle?.deletedAt).toBeNull();
        expect(lifecycle?.status).toBe("warned");
    });

    it("does not mark as deleted when the warning email was never sent", async () => {
        const userId = await insertUser({ updatedAt: "2024-01-01 00:00:00" });
        const lifecycleId = await insertLifecycle({
            userId,
            emailRetryCount: 3,
            warningSentAt: null,
            status: "mail_failed",
            lastSeenAt: "2024-01-01 00:00:00",
            deletionScheduledAt: "2024-02-01 00:00:00",
        });

        const marked = await InactiveAccountRepository.markAsDeleted(lifecycleId, userId, "unwarned-user");
        const deletionTargets = await InactiveAccountRepository.getDeletionTargets(3);
        const lifecycle = await getLifecycle(lifecycleId);

        expect(marked).toBe(false);
        expect(deletionTargets).toEqual([]);
        expect(lifecycle?.deletedAt).toBeNull();
        expect(lifecycle?.status).toBe("mail_failed");
    });

    it("does not mark resurrected lifecycle rows as deleted", async () => {
        const userId = await insertUser({ updatedAt: "2024-01-01 00:00:00" });
        const lifecycleId = await insertLifecycle({
            userId,
            status: "resurrected",
            lastSeenAt: "2024-01-01 00:00:00",
            resurrectedAt: "2024-01-02 00:00:00",
            deletionScheduledAt: "2024-02-01 00:00:00",
        });

        const marked = await InactiveAccountRepository.markAsDeleted(lifecycleId, userId, "resurrected-user");
        const lifecycle = await getLifecycle(lifecycleId);

        expect(marked).toBe(false);
        expect(lifecycle?.deletedAt).toBeNull();
        expect(lifecycle?.status).toBe("resurrected");
    });

    it("does not mark already deleted lifecycle rows again", async () => {
        const userId = await insertUser({ updatedAt: "2024-01-01 00:00:00" });
        const lifecycleId = await insertLifecycle({
            userId,
            status: "deleted",
            deletedAt: "2024-02-01 00:00:00",
            lastSeenAt: "2024-01-01 00:00:00",
            deletionScheduledAt: "2024-02-01 00:00:00",
        });

        const marked = await InactiveAccountRepository.markAsDeleted(lifecycleId, userId, "deleted-user");
        const lifecycle = await getLifecycle(lifecycleId);

        expect(marked).toBe(false);
        expect(lifecycle?.status).toBe("deleted");
        expect(lifecycle?.deletedAt).toBe("2024-02-01 00:00:00");
    });

    it("deletes users through the service only when the inactive lifecycle guard passes", async () => {
        const service = new UserService(
            UserRepository,
            new InactiveAccountService(InactiveAccountRepository),
        );

        const inactiveUserId = await insertUser({ id: 42, updatedAt: "2024-01-01 00:00:00" });
        const inactiveLifecycleId = await insertLifecycle({
            status: "warned",
            userId: inactiveUserId,
            lastSeenAt: "2024-01-01 00:00:00",
            deletionScheduledAt: "2024-02-01 00:00:00",
        });

        const activeAgainUserId = await insertUser({ id: 43, updatedAt: "2024-01-02 00:00:00" });
        const activeAgainLifecycleId = await insertLifecycle({
            status: "warned",
            userId: activeAgainUserId,
            lastSeenAt: "2024-01-01 00:00:00",
            deletionScheduledAt: "2024-02-01 00:00:00",
        });

        await expect(service.deleteUserAccount({
            type: "inactive",
            userId: inactiveUserId,
            username: "inactive-user",
            lifecycleId: inactiveLifecycleId,
        })).resolves.toBe(true);

        await expect(service.deleteUserAccount({
            type: "inactive",
            userId: activeAgainUserId,
            username: "active-again-user",
            lifecycleId: activeAgainLifecycleId,
        })).resolves.toBe(false);

        expect(await getUser(inactiveUserId)).toBeUndefined();
        expect(await getUser(activeAgainUserId)).toBeDefined();
        expect((await getLifecycle(inactiveLifecycleId))?.status).toBe("deleted");
        expect((await getLifecycle(activeAgainLifecycleId))?.status).toBe("warned");
    });
});


async function insertUser({ id = 42, updatedAt }: { id?: number; updatedAt: string }) {
    const userId = id;

    await dbContext.db.insert(user).values({
        updatedAt,
        id: userId,
        emailVerified: true,
        name: `test-user-${userId}`,
        createdAt: "2020-01-01 00:00:00",
        email: `test-user-${userId}@example.com`,
    });

    return userId;
}


async function insertLifecycle(values: {
    userId: number;
    lastSeenAt: string;
    deletedAt?: string;
    resurrectedAt?: string;
    emailRetryCount?: number;
    warningSentAt?: string | null;
    deletionScheduledAt: string;
    status: "warned" | "resurrected" | "deleted" | "mail_failed";
}) {
    const rows = await dbContext.db
        .insert(inactiveAccountDeletion)
        .values({
            userId: values.userId,
            status: values.status,
            emailRetryCount: values.emailRetryCount,
            username: "test-user",
            deletedAt: values.deletedAt,
            lastSeenAt: values.lastSeenAt,
            lastEmailError: "previous-error",
            resurrectedAt: values.resurrectedAt,
            warningSentAt: values.warningSentAt === undefined ? "2024-01-01 00:00:00" : values.warningSentAt,
            warningTokenHash: `token-hash-${values.userId}`,
            deletionScheduledAt: values.deletionScheduledAt,
        })
        .returning({ id: inactiveAccountDeletion.id });

    return rows[0].id;
}


async function getLifecycle(lifecycleId: number) {
    const rows = await dbContext.db
        .select()
        .from(inactiveAccountDeletion)
        .where(eq(inactiveAccountDeletion.id, lifecycleId))
        .limit(1);

    return rows[0];
}


async function getUser(userId: number) {
    const rows = await dbContext.db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    return rows[0];
}
