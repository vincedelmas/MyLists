import Database from "bun:sqlite";
import {expect, it} from "vitest";
import {readMigrationFiles} from "drizzle-orm/migrator";


it.each([false, true])("keeps existing data and removes a deleted title's details (foreign keys: %s)", foreignKeys => {
    const db = new Database(":memory:");
    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
    const index = migrations.findIndex(migration => migration.sql.some(statement =>
        statement.includes("CREATE TABLE `__new_series_actors`") && statement.includes("ON DELETE cascade"),
    ));
    const details = {
        movies: ["genre", "actors", "tags"],
        series: ["genre", "actors", "network", "episodes_per_season", "tags"],
        anime: ["genre", "actors", "network", "episodes_per_season", "tags"],
        games: ["genre", "platforms", "companies", "tags"],
        books: ["genre", "authors", "tags"],
        manga: ["genre", "authors", "tags"],
    };

    try {
        expect(index).toBeGreaterThan(0);
        db.transaction(() => {
            for (const migration of migrations.slice(0, index)) {
                for (const statement of migration.sql) db.run(statement);
            }
        })();
        db.run(`PRAGMA foreign_keys = ${foreignKeys ? "ON" : "OFF"}`);
        db.run(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
            VALUES (1, 'owner', 'owner@example.invalid', 1, '2026-01-01', '2026-01-01')`);

        const before = new Map<string, Record<string, unknown>[]>();
        for (const [type, suffixes] of Object.entries(details)) {
            const tv = type === "series" || type === "anime";
            const mediaColumns = tv ? ", duration, total_seasons, total_episodes"
                : type === "movies" ? ", duration"
                : type === "books" ? ", pages" : "";
            const mediaValues = tv ? ", 24, 1, 12" : type === "movies" || type === "books" ? ", 100" : "";
            db.query("INSERT INTO media_tags (user_id, media_type, name) VALUES (1, ?, 'Keep this tag')").run(type);
            const { id: tagId } = db.query<{ id: number }, [string]>("SELECT id FROM media_tags WHERE media_type = ?").get(type)!;

            for (const id of [1, 2]) {
                db.query(`INSERT INTO ${type} (id, api_id, name, image_cover${mediaColumns}) VALUES (?, ?, 'Title', 'cover.jpg'${mediaValues})`).run(id, id);
                for (const suffix of suffixes) {
                    const columns = suffix === "tags" ? "user_id, tag_id"
                        : suffix === "episodes_per_season" ? "season, episodes"
                        : suffix === "companies" ? "name, publisher, developer" : "name";
                    const values = suffix === "tags" ? `1, ${tagId}`
                        : suffix === "episodes_per_season" ? "1, 12"
                        : suffix === "companies" ? "'Studio', 1, 1" : "'Shared name'";
                    db.query(`INSERT INTO ${type}_${suffix} (id, media_id, ${columns}) VALUES (?, ?, ${values})`).run(id, id);
                }
            }

            const listColumns = tv ? ", current_season, current_episode" : type === "manga" ? ", current_chapter" : "";
            const listValues = tv ? ", 1, 5" : type === "manga" ? ", 10" : "";
            db.run(`INSERT INTO ${type}_list (id, user_id, media_id, status, rating, comment${listColumns})
                VALUES (2, 1, 2, 'In Progress', 7.5, 'Keep this comment'${listValues})`);
            if (tv) db.run(`INSERT INTO ${type}_list_seasons (list_id, season, redo, rating) VALUES (2, 1, 2, 8)`);

            const tables = [
                type,
                `${type}_list`,
                ...suffixes.map(suffix => `${type}_${suffix}`),
                ...(tv ? [`${type}_list_seasons`] : []),
            ];
            for (const table of tables) {
                before.set(table, db.query<Record<string, unknown>, []>(`SELECT * FROM ${table} ORDER BY 1`).all());
            }
        }
        const tagsBefore = db.query("SELECT * FROM media_tags ORDER BY id").all();
        const indexesBefore = db.query("SELECT name, tbl_name FROM sqlite_schema WHERE type = 'index' ORDER BY name").all();

        db.transaction(() => {
            for (const statement of migrations[index].sql) db.run(statement);
        })();

        for (const [table, rows] of before) {
            expect(db.query(`SELECT * FROM ${table} ORDER BY 1`).all()).toEqual(rows);
        }
        expect(db.query("SELECT name, tbl_name FROM sqlite_schema WHERE type = 'index' ORDER BY name").all()).toEqual(indexesBefore);
        expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: Number(foreignKeys) });
        db.run("PRAGMA foreign_keys = ON");

        for (const [type, suffixes] of Object.entries(details)) {
            expect(() => db.run(`DELETE FROM ${type} WHERE id IN (1, 2)`)).toThrow("FOREIGN KEY constraint failed");
            expect(db.query(`SELECT * FROM ${type} ORDER BY id`).all()).toEqual(before.get(type));
            for (const suffix of suffixes) {
                const table = `${type}_${suffix}`;
                expect(db.query(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(before.get(table));
            }

            db.run(`DELETE FROM ${type} WHERE id = 1`);

            for (const suffix of suffixes) {
                const table = `${type}_${suffix}`;
                expect(db.query(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(before.get(table)!.filter(row => row.media_id === 2));
            }
            expect(db.query(`SELECT * FROM ${type} ORDER BY id`).all()).toEqual(before.get(type)!.filter(row => row.id === 2));
            expect(db.query(`SELECT * FROM ${type}_list ORDER BY id`).all()).toEqual(before.get(`${type}_list`));
            if (type === "series" || type === "anime") {
                expect(db.query(`SELECT * FROM ${type}_list_seasons ORDER BY list_id, season`).all()).toEqual(before.get(`${type}_list_seasons`));
            }
        }
        expect(db.query("SELECT * FROM media_tags ORDER BY id").all()).toEqual(tagsBefore);
        expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
    }
    finally {
        db.close();
    }
});
