import {relations} from "@/lib/server/database/relations";
import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle, type SQLiteBunDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {PrivacyType, RoleType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {MAX_PROFILE_PINS, profilePinSchema} from "@/lib/schemas/profile-pins.schema";
import * as schema from "@/lib/server/database/schema";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {profilePinsRepository} from "./profile-pins.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as SQLiteBunDatabase<typeof relations> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));

const spec = {
    version: 2 as const, title: "Dynamic list", mediaTypes: "all" as const, filters: {},
    sort: { field: "addedAt" as const, direction: "asc" as const }, display: "grid" as const,
};


describe("shared profile pins", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle({ client: sqlite, relations });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        dbContext.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `user${id}`, email: `user${id}@example.invalid`, emailVerified: true,
            createdAt: "2026-01-01", updatedAt: "2026-01-01",
        }))).run();
        dbContext.db.insert(schema.dynamicLists).values([1, 2, 3, 4, 5].map(id => ({ id, userId: 1, spec }))).run();
        dbContext.db.insert(schema.collections).values([1, 2, 3].map(id => ({ id, ownerId: 1, title: `Collection ${id}` }))).run();
        dbContext.db.insert(schema.dynamicLists).values({ id: 10, userId: 2, spec, profilePosition: 1 }).run();
        dbContext.db.insert(schema.collections).values({ id: 10, ownerId: 2, title: "Other collection", profilePosition: 2 }).run();
    });

    afterEach(() => sqlite.close());

    it("shares the configured limit across kinds, distinguishes overlapping IDs and keeps rejected changes atomic", () => {
        const items = [{ kind: "dynamic" as const, id: 1 }, { kind: "collection" as const, id: 1 }, { kind: "dynamic" as const, id: 2 }, { kind: "collection" as const, id: 2 }];
        expect(items).toHaveLength(MAX_PROFILE_PINS);
        for (const item of items) profilePinsRepository.set(1, item, true);
        expect(profilePinsRepository.getOwn(1)).toEqual(items.map((item, index) => ({ ...item, position: index + 1 })));
        expect(() => profilePinsRepository.set(1, { kind: "dynamic", id: 3 }, true)).toThrow("up to 4");
        expect(profilePinsRepository.getOwn(1)).toHaveLength(MAX_PROFILE_PINS);
        expect(profilePinsRepository.getOwn(2)).toEqual([{ kind: "dynamic", id: 10, position: 1 }, { kind: "collection", id: 10, position: 2 }]);
    });

    it("rejects missing and foreign-owned items for either pin direction without changing existing pins", () => {
        profilePinsRepository.set(1, { kind: "dynamic", id: 1 }, true);
        for (const kind of ["dynamic", "collection"] as const) {
            for (const id of [10, 999]) {
                for (const pinned of [true, false]) expect(() => profilePinsRepository.set(1, { kind, id }, pinned)).toThrow(FormattedError);
            }
        }
        expect(profilePinsRepository.getOwn(1)).toEqual([{ kind: "dynamic", id: 1, position: 1 }]);
        expect(profilePinsRepository.getOwn(2)).toHaveLength(2);
    });

    it("does not reorder on repeated pin requests and appends after unpinning or deleting earlier items", () => {
        profilePinsRepository.set(1, { kind: "dynamic", id: 1 }, true);
        profilePinsRepository.set(1, { kind: "collection", id: 1 }, true);
        profilePinsRepository.set(1, { kind: "dynamic", id: 2 }, true);
        profilePinsRepository.set(1, { kind: "collection", id: 1 }, true);
        profilePinsRepository.set(1, { kind: "dynamic", id: 1 }, false);
        profilePinsRepository.set(1, { kind: "collection", id: 2 }, true);
        expect(profilePinsRepository.getOwn(1)).toEqual([{ kind: "collection", id: 1, position: 1 }, { kind: "dynamic", id: 2, position: 2 }, { kind: "collection", id: 2, position: 3 }]);
        dbContext.db.delete(schema.collections).where(eq(schema.collections.id, 1)).run();
        profilePinsRepository.set(1, { kind: "dynamic", id: 3 }, true);
        expect(profilePinsRepository.getOwn(1).map(pin => [pin.kind, pin.id, pin.position])).toEqual([["dynamic", 2, 1], ["collection", 2, 2], ["dynamic", 3, 3]]);
        dbContext.db.delete(schema.user).where(eq(schema.user.id, 1)).run();
        expect(profilePinsRepository.getOwn(1)).toEqual([]);
        expect(profilePinsRepository.getOwn(2)).toHaveLength(2);
    });

    it("retains collection privacy when pinned, omits private cards for visitors and leaves unpinned collections out", async () => {
        for (const [id, privacy] of [[1, PrivacyType.PUBLIC], [2, PrivacyType.RESTRICTED], [3, PrivacyType.PRIVATE]] as const) {
            dbContext.db.update(schema.collections).set({ privacy }).where(eq(schema.collections.id, id)).run();
            profilePinsRepository.set(1, { kind: "collection", id }, true);
        }
        dbContext.db.insert(schema.collections).values({ ownerId: 1, title: "Unpinned public", privacy: PrivacyType.PUBLIC }).run();
        expect((await CollectionsRepository.getUserCollections(1, { kind: "anonymous" }, undefined, true)).map(collection => collection.id)).toEqual([1, 2]);
        expect((await CollectionsRepository.getUserCollections(1, { kind: "user", id: 2, role: RoleType.USER }, undefined, true)).map(collection => collection.id)).toEqual([1, 2]);
        expect((await CollectionsRepository.getUserCollections(1, { kind: "user", id: 1, role: RoleType.USER }, undefined, true)).map(collection => collection.id)).toEqual([1, 2, 3]);
        expect((await CollectionsRepository.getUserCollections(1, { kind: "user", id: 2, role: RoleType.ADMIN }, undefined, true)).map(collection => collection.id)).toEqual([1, 2, 3]);
        expect((await CollectionsRepository.getUserCollections(1, { kind: "user", id: 2, role: RoleType.MANAGER }, undefined, true)).map(collection => collection.id)).toEqual([1, 2]);
        expect(dbContext.db.select({ privacy: schema.collections.privacy }).from(schema.collections).where(eq(schema.collections.id, 3)).get()?.privacy).toBe(PrivacyType.PRIVATE);
    });

    it("validates the pin target and rejects forged ownership or malformed data", () => {
        expect(profilePinSchema.parse({ kind: "collection", id: 1, pinned: true })).toEqual({ kind: "collection", id: 1, pinned: true });
        for (const data of [{ kind: "dynamic", id: 0, pinned: true }, { kind: "movie", id: 1, pinned: true }, { kind: "collection", id: 1, pinned: "true" }, { kind: "collection", id: 1, pinned: true, userId: 2 }]) {
            expect(profilePinSchema.safeParse(data).success).toBe(false);
        }
    });
});
