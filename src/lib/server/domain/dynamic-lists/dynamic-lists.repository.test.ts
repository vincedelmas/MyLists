import Database from "bun:sqlite";
import {readFileSync} from "node:fs";
import {eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {MAX_PROFILE_PINS} from "@/lib/schemas/profile-pins.schema";
import * as schema from "@/lib/server/database/schema";
import {dynamicListsRepository} from "./dynamic-lists.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));

const spec: DynamicListSpec = {
    version: 1, title: "Profile view", mediaTypes: "all", filters: {},
    sort: { field: "addedAt", direction: "asc" }, display: "grid",
};


describe("dynamic list persistence", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        dbContext.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `user${id}`, email: `user${id}@example.invalid`, emailVerified: true,
            createdAt: "2026-01-01", updatedAt: "2026-01-01",
        }))).run();
    });

    afterEach(() => sqlite.close());

    it("creates, updates and deletes only the owner's views, newest first", () => {
        const first = dynamicListsRepository.create(1, spec);
        const second = dynamicListsRepository.create(1, { ...spec, title: "Second" });
        const other = dynamicListsRepository.create(2, { ...spec, title: "Private view" });
        expect(dynamicListsRepository.getAll(1).map(view => view.id)).toEqual([second.id, first.id]);
        expect(dynamicListsRepository.getAll(2).map(view => view.id)).toEqual([other.id]);
        expect(() => dynamicListsRepository.get(2, first.id)).toThrow("Dynamic list not found");
        expect(() => dynamicListsRepository.update(2, first.id, { ...spec, title: "Stolen" })).toThrow("Dynamic list not found");
        expect(() => dynamicListsRepository.delete(2, first.id)).toThrow("Dynamic list not found");
        expect(dynamicListsRepository.get(1, first.id).spec.title).toBe(spec.title);
        dynamicListsRepository.update(1, first.id, { ...spec, title: "Updated" });
        expect(dynamicListsRepository.get(1, first.id).spec.title).toBe("Updated");
        dynamicListsRepository.delete(1, first.id);
        expect(() => dynamicListsRepository.get(1, first.id)).toThrow("Dynamic list not found");
        dbContext.db.delete(schema.user).where(eq(schema.user.id, 1)).run();
        expect(dynamicListsRepository.getAll(1)).toEqual([]);
        expect(dynamicListsRepository.getAll(2)).toHaveLength(1);
    });

    it("resolves owners independently of whether a dynamic list is pinned", () => {
        const view = dynamicListsRepository.create(1, spec);
        expect(dynamicListsRepository.getOwner(view.id)).toMatchObject({ id: 1, username: "user1" });
        expect(dynamicListsRepository.getOwner(view.id)).not.toHaveProperty("profilePosition");
        expect(dynamicListsRepository.get(1, view.id).profilePosition).toBeNull();
        expect(dynamicListsRepository.getPinned(1)).toEqual([]);
        dbContext.db.update(schema.dynamicLists).set({ profilePosition: 1 }).where(eq(schema.dynamicLists.id, view.id)).run();
        expect(dynamicListsRepository.getPinned(1)).toMatchObject([{ id: view.id, spec }]);
        expect(dynamicListsRepository.getPinned(2)).toEqual([]);
    });

    it("preserves existing saved rules when migrating to profile shortcuts", () => {
        sqlite.exec("DROP TABLE smart_views");
        sqlite.exec(readFileSync("./drizzle/0054_smart_views.sql", "utf8"));
        sqlite.query("INSERT INTO smart_views(user_id, spec) VALUES (?, ?)").run(1, JSON.stringify(spec));
        sqlite.exec(readFileSync("./drizzle/0055_smart_view_profile_shortcuts.sql", "utf8"));
        expect(dynamicListsRepository.getAll(1)).toMatchObject([{ spec, profilePosition: null }]);
        dbContext.db.update(schema.dynamicLists).set({ profilePosition: 1 }).run();
        expect(dynamicListsRepository.getPinned(1)).toMatchObject([{ id: 1, spec, profilePosition: 1 }]);
    });

    it("preserves pinned views while leaving the configured maximum to the application", () => {
        sqlite.exec("DROP TABLE smart_views");
        sqlite.exec(readFileSync("./drizzle/0054_smart_views.sql", "utf8"));
        sqlite.query("INSERT INTO smart_views(user_id, spec) VALUES (?, ?)").run(1, JSON.stringify(spec));
        sqlite.exec(readFileSync("./drizzle/0055_smart_view_profile_shortcuts.sql", "utf8"));
        dbContext.db.update(schema.dynamicLists).set({ profilePosition: 1 }).run();
        sqlite.exec(readFileSync("./drizzle/0056_smart_view_profile_limit.sql", "utf8"));
        expect(dynamicListsRepository.getPinned(1)[0]).toMatchObject({ id: 1, spec, profilePosition: 1 });
        dbContext.db.update(schema.dynamicLists).set({ profilePosition: MAX_PROFILE_PINS + 1 }).run();
        expect(dynamicListsRepository.getPinned(1)[0].profilePosition).toBe(MAX_PROFILE_PINS + 1);
        expect(() => dbContext.db.update(schema.dynamicLists).set({ profilePosition: 0 }).run()).toThrow();
    });
});
