import Database from "bun:sqlite";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {expect, it} from "vitest";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";


it.each([false, true])("simplifies list storage without losing tracking or season data (foreign keys: %s)", foreignKeys => {
    const db = new Database(":memory:");
    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
    const index = migrations.findIndex(migration => migration.sql.some(statement => statement.includes("series_list_seasons_favorite_migration")));

    try {
        expect(index).toBeGreaterThan(0);
        db.transaction(() => {
            for (const migration of migrations.slice(0, index)) {
                for (const statement of migration.sql) db.run(statement);
            }
        })();
        db.run(`PRAGMA foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
        db.run(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
            VALUES (1, 'migrating', 'migration@example.invalid', 1, '2026-01-01', '2026-01-01')`);

        const listsBefore = new Map<string, Record<string, unknown>[]>();
        for (const type of ALL_MEDIA_TYPES) {
            const tv = type === "series" || type === "anime";
            const mediaColumns = tv ? ", duration, total_seasons, total_episodes" : type === "movies" ? ", duration" : type === "books" ? ", pages" : "";
            const mediaValues = tv ? ", 24, 1, 12" : type === "movies" || type === "books" ? ", 100" : "";
            const listColumns = tv ? ", current_season, current_episode" : type === "manga" ? ", current_chapter" : "";
            const listValues = tv ? ", 1, 5" : type === "manga" ? ", 10" : "";
            for (let id = 1; id <= 4; id++) {
                db.query(`INSERT INTO ${type} (id, api_id, name, image_cover${mediaColumns}) VALUES (?, ?, 'Title', 'cover.jpg'${mediaValues})`).run(id, id);
                if (id === 4) continue;
                db.query(`INSERT INTO ${type}_list (id, user_id, media_id, status, favorite, rating, comment, custom_cover, release_notifications_enabled${listColumns})
                    VALUES (?, 1, ?, 'Completed', ?, ?, 'Keep comment', 'custom.jpg', 0${listValues})`)
                    .run(id, id, [null, 0, 1][id - 1], [0, 7.5, null][id - 1]);
            }
            listsBefore.set(type, db.query<Record<string, unknown>, []>(`SELECT * FROM ${type}_list ORDER BY id`).all());
            db.query(`INSERT INTO user_media_settings (user_id, media_type, active, entries_rated, sum_entries_rated, average_rating)
                VALUES (1, ?, 1, 2, 7.5, 3.75)`).run(type);
            db.query(`INSERT INTO user_media_stats_history (user_id, media_type, media_id, active, entries_rated, sum_entries_rated, average_rating)
                VALUES (1, ?, 1, 1, 2, 7.5, 3.75)`).run(type);
            if (tv) {
                db.run(`INSERT INTO ${type}_list_seasons (list_id, season, redo, rating) VALUES (1, 1, 2, 0), (2, 1, 0, 7.5), (3, 9, 3, NULL)`);
            }
        }
        const seasonRows = new Map(["series", "anime"].map(type => [type, db.query(`SELECT * FROM ${type}_list_seasons ORDER BY list_id, season`).all()]));
        const summariesBefore = new Map(["user_media_settings", "user_media_stats_history"].map(table => [table,
            db.query<Record<string, unknown>, []>(`SELECT * FROM ${table} ORDER BY id`).all()
                .map(({ average_rating: _average, ...row }) => row),
        ]));

        db.transaction(() => {
            for (const migration of migrations.slice(index)) {
                for (const statement of migration.sql) db.run(statement);
            }
        })();

        for (const type of ALL_MEDIA_TYPES) {
            expect(db.query(`SELECT * FROM ${type}_list ORDER BY id`).all()).toEqual(
                listsBefore.get(type)!.map(row => ({ ...row, favorite: row.favorite ?? 0 })),
            );
            const listColumns = type === "series" || type === "anime" ? ", current_season, current_episode" : type === "manga" ? ", current_chapter" : "";
            const listValues = type === "series" || type === "anime" ? ", 1, 0" : type === "manga" ? ", 0" : "";
            db.run(`INSERT INTO ${type}_list (id, user_id, media_id, status${listColumns}) VALUES (4, 1, 4, 'Planned'${listValues})`);
            expect(db.query(`SELECT favorite FROM ${type}_list WHERE id = 4`).get()).toEqual({ favorite: 0 });
            expect(() => db.run(`UPDATE ${type}_list SET favorite = NULL WHERE id = 4`)).toThrow("NOT NULL constraint failed");
            expect(() => db.run(`UPDATE ${type}_list SET favorite = 2 WHERE id = 4`)).toThrow("CHECK constraint failed");
        }
        for (const [type, rows] of seasonRows) {
            expect(db.query(`SELECT * FROM ${type}_list_seasons ORDER BY list_id, season`).all()).toEqual(rows);
        }
        for (const [table, rows] of summariesBefore) {
            expect(db.query(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(rows);
            expect(db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all().some(column => column.name === "average_rating")).toBe(false);
        }
        expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: Number(foreignKeys) });
        expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    }
    finally {
        db.close();
    }
});
