import Database from "bun:sqlite";
import {describe, expect, it} from "vitest";
import {readMigrationFiles} from "drizzle-orm/migrator";


const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
const mixedMediaIndex = migrations.findIndex(migration => migration.sql.some(statement =>
    statement.includes("ALTER TABLE `collections` DROP COLUMN `media_type`")));


describe("mixed-media collections migration", () => {
    it("preserves existing collections, items and likes with foreign keys enabled, and permits typed IDs", () => {
        const db = new Database(":memory:");
        try {
            expect(mixedMediaIndex).toBeGreaterThan(0);
            db.transaction(() => {
                for (const migration of migrations.slice(0, mixedMediaIndex)) {
                    for (const statement of migration.sql) db.exec(statement);
                }
            })();
            db.exec("PRAGMA foreign_keys=ON");
            db.exec(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES
                (1, 'owner', 'owner@example.invalid', 1, '2025-01-01', '2025-01-01'),
                (2, 'visitor', 'visitor@example.invalid', 1, '2025-01-01', '2025-01-01')`);
            db.exec(`INSERT INTO collections (id, owner_id, title, description, media_type, ordered, privacy,
                view_count, like_count, copied_count, created_at, updated_at)
                VALUES (7, 1, 'Existing favorites', 'Keep these notes', 'movies', 1, 'public', 5, 1, 3,
                '2025-02-01', '2025-03-01')`);
            db.exec(`INSERT INTO collection_items (id, collection_id, media_id, media_type, order_index, annotation, created_at)
                VALUES (11, 7, 1, 'movies', 1, 'First pick', '2025-02-01'),
                (12, 7, 2, 'movies', 2, 'Second pick', '2025-02-02')`);
            db.exec("INSERT INTO collection_likes (id, user_id, collection_id, created_at) VALUES (13, 2, 7, '2025-02-03')");

            const collection = db.query<Record<string, unknown>, []>("SELECT * FROM collections").get()!;
            const { media_type: _mediaType, ...expectedCollection } = collection;
            const items = db.query("SELECT * FROM collection_items ORDER BY order_index").all();
            const likes = db.query("SELECT * FROM collection_likes").all();

            db.transaction(() => {
                for (const statement of migrations[mixedMediaIndex].sql) db.exec(statement);
            })();

            expect(db.prepare("SELECT * FROM collections").get()).toEqual(expectedCollection);
            expect(db.query("SELECT * FROM collection_items ORDER BY order_index").all()).toEqual(items);
            expect(db.query("SELECT * FROM collection_likes").all()).toEqual(likes);
            expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
            expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);

            db.exec("INSERT INTO collection_items (collection_id, media_id, media_type, order_index) VALUES (7, 1, 'books', 3)");
            expect(() => db.exec("INSERT INTO collection_items (collection_id, media_id, media_type, order_index) VALUES (7, 1, 'books', 4)"))
                .toThrow();
            expect(() => db.exec("INSERT INTO collection_items (collection_id, media_id, media_type, order_index) VALUES (7, 3, 'books', 3)"))
                .toThrow();
            expect(() => db.exec("INSERT INTO collection_items (collection_id, media_id, media_type, order_index) VALUES (99, 3, 'books', 1)"))
                .toThrow();

            db.exec("DELETE FROM collections WHERE id = 7");
            expect(db.query("SELECT * FROM collection_items").all()).toEqual([]);
            expect(db.query("SELECT * FROM collection_likes").all()).toEqual([]);
        }
        finally {
            db.close();
        }
    });
});
