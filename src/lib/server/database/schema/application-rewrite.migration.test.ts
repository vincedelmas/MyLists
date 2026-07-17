import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it} from "vitest";


describe("application rewrite migration rehearsal", () => {
    let sqlite: Database;
    let baselineMigrations: string;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        baselineMigrations = createBaselineMigrationFolder(36);
        migrate(drizzle(sqlite), { migrationsFolder: baselineMigrations });
        sqlite.run("PRAGMA foreign_keys = ON");
    });

    afterEach(() => {
        sqlite.close();
        fs.rmSync(baselineMigrations, { recursive: true, force: true });
    });

    it("normalizes stored activity payloads and preserves catalog/library identities through the direct cutover", () => {
        sqlite.exec(`
            INSERT INTO user (
                id, name, email, created_at, updated_at, email_verified, privacy
            ) VALUES (
                1, 'migration-user', 'migration@example.com',
                '2025-01-01 00:00:00', '2025-01-01 00:00:00', 1, 'public'
            );

            INSERT INTO series (
                id, api_id, name, image_cover, duration, total_seasons, total_episodes
            ) VALUES (101, 9001, 'Migrated Series', 'series.jpg', 24, 1, 12);

            INSERT INTO series_list (
                id, user_id, media_id, status, favorite, current_season,
                current_episode, redo, total, redo2, added_at, last_updated
            ) VALUES (
                201, 1, 101, 'Watching', 0, 1, 3, 0, 3, '[0]',
                '2025-01-02 00:00:00', '2025-02-03 00:00:00'
            );

            INSERT INTO user_media_update (
                id, user_id, media_id, media_name, media_type,
                update_type, payload, timestamp
            ) VALUES (
                301, 1, 101, 'Migrated Series', 'series', 'Episode',
                '{"old_value":2,"new_value":3}', '2025-02-03 12:00:00'
            );

            INSERT INTO user_media_activity (
                id, user_id, media_id, media_type, specific_gained,
                is_completed, is_redo, month_bucket, last_update, hidden
            ) VALUES (
                401, 1, 101, 'series', 3, 0, 0,
                '2025-02', '2025-02-03 12:00:00', 0
            );
        `);

        // SQLite cannot change foreign-key enforcement inside Drizzle's migration transaction.
        // The deployment rehearsal disables it before the transaction, then re-enables and audits it.
        sqlite.run("PRAGMA foreign_keys = OFF");
        migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        const change = sqlite.query(`
            SELECT change.payload, change.occurred_at, item.kind, item.name
            FROM library_change change
            JOIN library_entry entry ON entry.id = change.library_entry_id
            JOIN catalog_item item ON item.id = entry.catalog_item_id
        `).get() as { payload: string; occurred_at: string; kind: string; name: string };
        expect(JSON.parse(change.payload)).toEqual({ oldValue: 2, newValue: 3 });
        expect(change).toMatchObject({
            occurred_at: "2025-02-03 12:00:00",
            kind: "series",
            name: "Migrated Series",
        });

        expect(sqlite.query(`
            SELECT activity.user_id, activity.kind, activity.units_gained,
                activity.month_bucket, item.name
            FROM library_activity activity
            JOIN catalog_item item ON item.id = activity.catalog_item_id
        `).get()).toEqual({
            user_id: 1,
            kind: "series",
            units_gained: 3,
            month_bucket: "2025-02",
            name: "Migrated Series",
        });

        expect(sqlite.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_media_update'").get())
            .toBeNull();
        expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
    });

    it("renames collection tables and normalizes legacy library change keys without losing data", () => {
        const preRenameMigrations = createBaselineMigrationFolder(56);
        try {
            sqlite.run("PRAGMA foreign_keys = OFF");
            migrate(drizzle(sqlite), { migrationsFolder: preRenameMigrations });
            sqlite.run("PRAGMA foreign_keys = ON");

            sqlite.exec(`
                INSERT INTO user (
                    id, name, email, created_at, updated_at, email_verified, privacy
                ) VALUES (
                    1, 'collection-owner', 'owner@example.com',
                    '2025-01-01 00:00:00', '2025-01-01 00:00:00', 1, 'public'
                );

                INSERT INTO catalog_item (
                    id, kind, primary_provider, primary_external_id, name, image_cover
                ) VALUES (10, 'movies', 'tmdb', '100', 'Preserved Movie', 'movie.jpg');

                INSERT INTO library_entry (id, user_id, catalog_item_id, status)
                VALUES (20, 1, 10, 'Completed');

                INSERT INTO library_change (id, library_entry_id, update_type, payload)
                VALUES (30, 20, 'rating', '{"old_value":6,"new_value":8}');

                INSERT INTO editorial_collection (
                    id, owner_id, title, kind, visibility, ordered, view_count, copied_count
                ) VALUES (40, 1, 'Preserved Collection', 'movies', 'public', 1, 7, 2);

                INSERT INTO editorial_collection_item (collection_id, catalog_item_id, position, annotation)
                VALUES (40, 10, 1, 'Keep this note');

                INSERT INTO editorial_collection_like (collection_id, user_id)
                VALUES (40, 1);
            `);

            sqlite.run("PRAGMA foreign_keys = OFF");
            migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
            sqlite.run("PRAGMA foreign_keys = ON");

            expect(sqlite.query("SELECT title, view_count, copied_count FROM collection WHERE id = 40").get()).toEqual({
                title: "Preserved Collection",
                view_count: 7,
                copied_count: 2,
            });
            expect(sqlite.query("SELECT catalog_item_id, position, annotation FROM collection_item WHERE collection_id = 40").get()).toEqual({
                catalog_item_id: 10,
                position: 1,
                annotation: "Keep this note",
            });
            expect(sqlite.query("SELECT user_id FROM collection_like WHERE collection_id = 40").get()).toEqual({ user_id: 1 });

            const payload = sqlite.query("SELECT payload FROM library_change WHERE id = 30").get() as { payload: string };
            expect(JSON.parse(payload.payload)).toEqual({ oldValue: 6, newValue: 8 });

            expect(sqlite.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'editorial_collection'").get())
                .toBeNull();
            expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
        }
        finally {
            fs.rmSync(preRenameMigrations, { recursive: true, force: true });
        }
    });
});


const createBaselineMigrationFolder = (lastIndex: number) => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "mylists-baseline-migrations-"));
    fs.mkdirSync(path.join(target, "meta"));

    const journalPath = path.resolve("drizzle/meta/_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
        version: string;
        dialect: string;
        entries: Array<{ idx: number; tag: string }>;
    };
    const entries = journal.entries.filter(({ idx }) => idx <= lastIndex);
    fs.writeFileSync(path.join(target, "meta/_journal.json"), JSON.stringify({
        version: journal.version,
        dialect: journal.dialect,
        entries,
    }));

    for (const { tag } of entries) {
        fs.copyFileSync(path.resolve(`drizzle/${tag}.sql`), path.join(target, `${tag}.sql`));
    }
    return target;
};
