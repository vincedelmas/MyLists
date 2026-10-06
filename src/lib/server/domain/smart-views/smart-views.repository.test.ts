import Database from "bun:sqlite";
import {readFileSync} from "node:fs";
import {eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {MAX_PROFILE_SMART_VIEWS} from "@/lib/schemas/smart-view-profile.schema";
import * as schema from "@/lib/server/database/schema";
import {smartViewsRepository} from "./smart-views.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));

const spec: SmartViewSpec = {
    version: 1, title: "Profile view", mediaTypes: "all", filters: {},
    sort: { field: "addedAt", direction: "asc" }, display: "grid",
};


describe("smart list persistence and profile selection", () => {
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
        const first = smartViewsRepository.create(1, spec);
        const second = smartViewsRepository.create(1, { ...spec, title: "Second" });
        const other = smartViewsRepository.create(2, { ...spec, title: "Private view" });
        expect(smartViewsRepository.getAll(1).map(view => view.id)).toEqual([second.id, first.id]);
        expect(smartViewsRepository.getAll(2).map(view => view.id)).toEqual([other.id]);
        expect(() => smartViewsRepository.get(2, first.id)).toThrow("Smart list not found");
        expect(() => smartViewsRepository.update(2, first.id, { ...spec, title: "Stolen" })).toThrow("Smart list not found");
        expect(() => smartViewsRepository.delete(2, first.id)).toThrow("Smart list not found");
        expect(smartViewsRepository.get(1, first.id).spec.title).toBe(spec.title);
        smartViewsRepository.update(1, first.id, { ...spec, title: "Updated" });
        expect(smartViewsRepository.get(1, first.id).spec.title).toBe("Updated");
        smartViewsRepository.delete(1, first.id);
        expect(() => smartViewsRepository.get(1, first.id)).toThrow("Smart list not found");
        dbContext.db.delete(schema.user).where(eq(schema.user.id, 1)).run();
        expect(smartViewsRepository.getAll(1)).toEqual([]);
        expect(smartViewsRepository.getAll(2)).toHaveLength(1);
    });

    it("keeps views private until selected, orders shortcuts, and swaps positions atomically", () => {
        const views = Array.from({ length: 4 }, (_, index) => smartViewsRepository.create(1, { ...spec, title: `View ${index}` }));
        expect(smartViewsRepository.getProfileViews(1)).toEqual([]);
        expect(smartViewsRepository.get(1, views[0].id).profilePosition).toBeNull();
        const ids = [views[2].id, views[0].id, views[3].id, views[1].id];
        expect(smartViewsRepository.setProfileViews(1, ids).map(view => [view.id, view.profilePosition]))
            .toEqual(ids.map((id, index) => [id, index + 1]));
        expect(smartViewsRepository.setProfileViews(1, [...ids].reverse()).map(view => view.id)).toEqual([...ids].reverse());
        expect(smartViewsRepository.setProfileViews(1, [ids[0]]).map(view => view.id)).toEqual([ids[0]]);
        expect(smartViewsRepository.get(1, ids[1]).profilePosition).toBeNull();
        expect(smartViewsRepository.setProfileViews(1, [])).toEqual([]);
    });

    it("rejects invalid selections before clearing existing shortcuts or changing another owner", () => {
        const first = smartViewsRepository.create(1, spec);
        const second = smartViewsRepository.create(1, spec);
        const other = smartViewsRepository.create(2, spec);
        smartViewsRepository.setProfileViews(1, [first.id]);
        smartViewsRepository.setProfileViews(2, [other.id]);
        for (const ids of [[second.id, other.id], [second.id, 999_999]]) {
            expect(() => smartViewsRepository.setProfileViews(1, ids)).toThrow("your own library");
            expect(smartViewsRepository.getProfileViews(1).map(view => view.id)).toEqual([first.id]);
            expect(smartViewsRepository.getProfileViews(2).map(view => view.id)).toEqual([other.id]);
        }
    });

    it("shares only explicitly selected views belonging to the requested profile", () => {
        const pinned = smartViewsRepository.create(1, spec);
        const privateView = smartViewsRepository.create(1, spec);
        smartViewsRepository.setProfileViews(1, [pinned.id]);
        expect(smartViewsRepository.getProfileViews(1).map(view => view.id)).toEqual([pinned.id]);
        expect(smartViewsRepository.getOwner(privateView.id)).toMatchObject({ id: 1, username: "user1", profilePosition: null });
        expect(smartViewsRepository.getProfileViews(2)).toEqual([]);
        smartViewsRepository.setProfileViews(1, []);
        expect(smartViewsRepository.getProfileViews(1)).toEqual([]);
    });

    it("removes deleted shortcuts and preserves the remaining order without affecting other owners", () => {
        const first = smartViewsRepository.create(1, spec);
        const second = smartViewsRepository.create(1, spec);
        const other = smartViewsRepository.create(2, spec);
        smartViewsRepository.setProfileViews(1, [first.id, second.id]);
        smartViewsRepository.setProfileViews(2, [other.id]);
        smartViewsRepository.delete(1, first.id);
        expect(smartViewsRepository.getProfileViews(1).map(view => view.id)).toEqual([second.id]);
        expect(smartViewsRepository.setProfileViews(1, [second.id])[0].profilePosition).toBe(1);
        dbContext.db.delete(schema.user).where(eq(schema.user.id, 1)).run();
        expect(smartViewsRepository.getProfileViews(1)).toEqual([]);
        expect(smartViewsRepository.getProfileViews(2).map(view => view.id)).toEqual([other.id]);
    });

    it("preserves existing saved rules when migrating to profile shortcuts", () => {
        sqlite.exec("DROP TABLE smart_views");
        sqlite.exec(readFileSync("./drizzle/0054_smart_views.sql", "utf8"));
        sqlite.query("INSERT INTO smart_views(user_id, spec) VALUES (?, ?)").run(1, JSON.stringify(spec));
        sqlite.exec(readFileSync("./drizzle/0055_smart_view_profile_shortcuts.sql", "utf8"));
        expect(smartViewsRepository.getAll(1)).toMatchObject([{ spec, profilePosition: null }]);
        expect(smartViewsRepository.setProfileViews(1, [1])[0]).toMatchObject({ id: 1, spec, profilePosition: 1 });
    });

    it("preserves pinned views while relaxing the database limit for future configuration changes", () => {
        sqlite.exec("DROP TABLE smart_views");
        sqlite.exec(readFileSync("./drizzle/0054_smart_views.sql", "utf8"));
        sqlite.query("INSERT INTO smart_views(user_id, spec) VALUES (?, ?)").run(1, JSON.stringify(spec));
        sqlite.exec(readFileSync("./drizzle/0055_smart_view_profile_shortcuts.sql", "utf8"));
        smartViewsRepository.setProfileViews(1, [1]);
        sqlite.exec(readFileSync("./drizzle/0056_smart_view_profile_limit.sql", "utf8"));
        expect(smartViewsRepository.getProfileViews(1)[0]).toMatchObject({ id: 1, spec, profilePosition: 1 });
        dbContext.db.update(schema.smartViews).set({ profilePosition: MAX_PROFILE_SMART_VIEWS + 1 })
            .where(eq(schema.smartViews.id, 1)).run();
        expect(smartViewsRepository.getProfileViews(1)[0].profilePosition).toBe(MAX_PROFILE_SMART_VIEWS + 1);
        expect(() => dbContext.db.update(schema.smartViews).set({ profilePosition: 0 }).run()).toThrow();
    });
});
